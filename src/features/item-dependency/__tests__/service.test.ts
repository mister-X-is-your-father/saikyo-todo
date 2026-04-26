/**
 * itemDependencyService integration test.
 * 実 Supabase + RLS + audit_log を通す。auth guard のみ vi.mock。
 *
 * 前提: `pnpm exec supabase start` で local Supabase が動いていること。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { itemService } from '@/features/item/service'

import { itemDependencyService } from '../service'

describe('itemDependencyService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('dep-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(title: string, isMust = false) {
    const r = await itemService.create({
      workspaceId: wsId,
      title,
      idempotencyKey: randomUUID(),
      isMust,
      dod: isMust ? 'PASS' : null,
    })
    if (!r.ok) throw new Error(`create failed: ${r.error.message}`)
    return r.value
  }

  it('blocks 依存を追加できる + listForItem に反映', async () => {
    const a = await createItem('A')
    const b = await createItem('B')
    const r = await itemDependencyService.add({
      fromItemId: a.id,
      toItemId: b.id,
      type: 'blocks',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.fromItemId).toBe(a.id)
    expect(r.value.toItemId).toBe(b.id)

    const list = await itemDependencyService.listForItem(b.id)
    expect(list.ok).toBe(true)
    if (!list.ok) return
    expect(list.value.blockedBy).toHaveLength(1)
    expect(list.value.blockedBy[0]?.ref.id).toBe(a.id)
    expect(list.value.blocking).toHaveLength(0)
  })

  it('自己依存は ValidationError', async () => {
    const a = await createItem('self')
    const r = await itemDependencyService.add({
      fromItemId: a.id,
      toItemId: a.id,
      type: 'blocks',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('VALIDATION')
  })

  it('循環 (A→B, B→A) は ValidationError', async () => {
    const a = await createItem('cycA')
    const b = await createItem('cycB')
    const r1 = await itemDependencyService.add({
      fromItemId: a.id,
      toItemId: b.id,
      type: 'blocks',
    })
    expect(r1.ok).toBe(true)
    const r2 = await itemDependencyService.add({
      fromItemId: b.id,
      toItemId: a.id,
      type: 'blocks',
    })
    expect(r2.ok).toBe(false)
    if (!r2.ok) {
      expect(r2.error.code).toBe('VALIDATION')
      expect(r2.error.message).toContain('循環')
    }
  })

  it('多段循環 (A→B, B→C, C→A) も検出', async () => {
    const a = await createItem('mA')
    const b = await createItem('mB')
    const c = await createItem('mC')
    expect(
      (await itemDependencyService.add({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })).ok,
    ).toBe(true)
    expect(
      (await itemDependencyService.add({ fromItemId: b.id, toItemId: c.id, type: 'blocks' })).ok,
    ).toBe(true)
    const r = await itemDependencyService.add({
      fromItemId: c.id,
      toItemId: a.id,
      type: 'blocks',
    })
    expect(r.ok).toBe(false)
  })

  it('relates_to は循環チェック対象外 (双方向 OK)', async () => {
    const a = await createItem('rA')
    const b = await createItem('rB')
    expect(
      (
        await itemDependencyService.add({
          fromItemId: a.id,
          toItemId: b.id,
          type: 'relates_to',
        })
      ).ok,
    ).toBe(true)
    expect(
      (
        await itemDependencyService.add({
          fromItemId: b.id,
          toItemId: a.id,
          type: 'relates_to',
        })
      ).ok,
    ).toBe(true)
  })

  it('removeDependency で依存を削除できる', async () => {
    const a = await createItem('rmA')
    const b = await createItem('rmB')
    expect(
      (await itemDependencyService.add({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })).ok,
    ).toBe(true)
    const r = await itemDependencyService.remove({
      fromItemId: a.id,
      toItemId: b.id,
      type: 'blocks',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.removed).toBe(true)

    const list = await itemDependencyService.listForItem(b.id)
    if (!list.ok) throw new Error('list failed')
    expect(list.value.blockedBy).toHaveLength(0)
  })

  it('idempotent: 同じ依存を 2 回追加しても 1 件のまま', async () => {
    const a = await createItem('idA')
    const b = await createItem('idB')
    expect(
      (await itemDependencyService.add({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })).ok,
    ).toBe(true)
    expect(
      (await itemDependencyService.add({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })).ok,
    ).toBe(true)
    const list = await itemDependencyService.listForItem(b.id)
    if (!list.ok) throw new Error('list failed')
    expect(list.value.blockedBy).toHaveLength(1)
  })

  it('別 workspace の Item は依存にできない', async () => {
    const otherFx = await createTestUserAndWorkspace('dep-other')
    const ac = adminClient()
    const { data: otherItem } = await ac
      .from('items')
      .insert({
        workspace_id: otherFx.wsId,
        title: 'other ws item',
        created_by_actor_type: 'user',
        created_by_actor_id: otherFx.userId,
      })
      .select('id')
      .single()
    try {
      const a = await createItem('crossA')
      const r = await itemDependencyService.add({
        fromItemId: a.id,
        toItemId: otherItem!.id as string,
        type: 'blocks',
      })
      // 別 ws の item は RLS で見えない → NotFoundError か ValidationError
      expect(r.ok).toBe(false)
    } finally {
      await otherFx.cleanup()
    }
  })

  it('audit_log に add/remove が記録される', async () => {
    const a = await createItem('audA')
    const b = await createItem('audB')
    await itemDependencyService.add({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })
    await itemDependencyService.remove({ fromItemId: a.id, toItemId: b.id, type: 'blocks' })

    const ac = adminClient()
    const { data } = await ac
      .from('audit_log')
      .select('action, after, before')
      .eq('workspace_id', wsId)
      .eq('target_type', 'item_dependency')
      .eq('target_id', a.id)
      .order('ts', { ascending: true })
    expect(data?.length).toBeGreaterThanOrEqual(2)
    const actions = data?.map((r) => r.action) ?? []
    expect(actions).toContain('add')
    expect(actions).toContain('remove')
  })
})
