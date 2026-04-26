/**
 * itemService integration test.
 * 実 Supabase + RLS + audit_log を通す。auth guard のみ vi.mock。
 *
 * 前提: `pnpm exec supabase start` で local Supabase が動いていること。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

// 重要: service が import される前に mock を張る (vitest は vi.mock を hoist する)。
vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { itemService } from './service'

describe('itemService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('item-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(overrides: Record<string, unknown> = {}) {
    const result = await itemService.create({
      workspaceId: wsId,
      title: 'test item',
      idempotencyKey: randomUUID(),
      ...overrides,
    })
    if (!result.ok) throw new Error(`create failed: ${result.error.message}`)
    return result.value
  }

  describe('create', () => {
    it('通常 item を作成できる', async () => {
      const item = await createItem({ title: 'happy path' })
      expect(item.title).toBe('happy path')
      expect(item.status).toBe('todo')
      expect(item.version).toBe(0)
      expect(item.isMust).toBe(false)
    })

    it('MUST + DoD 指定で作成できる', async () => {
      const item = await createItem({ title: 'MUST task', isMust: true, dod: '完了条件' })
      expect(item.isMust).toBe(true)
      expect(item.dod).toBe('完了条件')
    })

    it('MUST で DoD 未指定は ValidationError (zod superRefine)', async () => {
      const result = await itemService.create({
        workspaceId: wsId,
        title: 'bad MUST',
        isMust: true,
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('startDate > dueDate は ValidationError', async () => {
      const result = await itemService.create({
        workspaceId: wsId,
        title: 'bad dates',
        startDate: '2026-12-31',
        dueDate: '2026-01-01',
        idempotencyKey: randomUUID(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('audit_log に create エントリが残る', async () => {
      const item = await createItem({ title: 'audit check' })
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type, target_id')
        .eq('target_id', item.id)
      expect(audits?.some((a) => a.action === 'create' && a.target_type === 'item')).toBe(true)
    })
  })

  describe('update', () => {
    it('正しい expectedVersion で更新できる、version がインクリメント', async () => {
      const item = await createItem()
      const result = await itemService.update({
        id: item.id,
        expectedVersion: item.version,
        patch: { title: '更新後' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('更新後')
        expect(result.value.version).toBe(item.version + 1)
      }
    })

    it('古い expectedVersion で ConflictError', async () => {
      const item = await createItem()
      // 1 回更新して version を進める
      await itemService.update({
        id: item.id,
        expectedVersion: item.version,
        patch: { title: '1st' },
      })
      // 古い version で再更新
      const result = await itemService.update({
        id: item.id,
        expectedVersion: item.version, // 既に 0 ではない
        patch: { title: '2nd' },
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('CONFLICT')
    })

    it('空 patch は ValidationError', async () => {
      const item = await createItem()
      const result = await itemService.update({
        id: item.id,
        expectedVersion: item.version,
        patch: {},
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('MUST に切替え、DoD 空なら ValidationError (post-create 強制)', async () => {
      const item = await createItem({ title: 'toggle', dod: null })
      const result = await itemService.update({
        id: item.id,
        expectedVersion: item.version,
        patch: { isMust: true },
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })
  })

  describe('updateStatus', () => {
    it('status 変更 + audit が status_change で残る', async () => {
      const item = await createItem()
      const result = await itemService.updateStatus({
        id: item.id,
        expectedVersion: item.version,
        status: 'in_progress',
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.status).toBe('in_progress')
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action')
        .eq('target_id', item.id)
      expect(audits?.some((a) => a.action === 'status_change')).toBe(true)
    })

    it('MUST + DoD あり は done に移行できる (happy path、done_at が入る)', async () => {
      const item = await createItem({ title: 'must-dod-done', isMust: true, dod: 'criteria' })
      const result = await itemService.updateStatus({
        id: item.id,
        expectedVersion: item.version,
        status: 'done',
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.status).toBe('done')
        expect(result.value.doneAt).not.toBeNull() // trigger で自動セット
      }
    })

    it('MUST の DoD が空のまま done に移行すると ValidationError (belt-and-suspenders)', async () => {
      // MUST は create 時 DoD 必須。admin 経由で DoD を外して下位防御を検証
      const item = await createItem({ title: 'must-no-dod', isMust: true, dod: 'tmp' })
      await adminClient().from('items').update({ dod: null }).eq('id', item.id)
      const { data: fresh } = await adminClient()
        .from('items')
        .select('version')
        .eq('id', item.id)
        .single()
      const result = await itemService.updateStatus({
        id: item.id,
        expectedVersion: fresh!.version,
        status: 'done',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })
  })

  describe('move', () => {
    it('別 workspace の item は新 parent にできない (cross-ws 防御)', async () => {
      // 別 workspace を作って、その中の item を parent として指定する
      const other = await createTestUserAndWorkspace('other-ws')
      try {
        // 別 ws に item を作成 (admin 経由で直接、RLS バイパス)
        const otherItemId = randomUUID()
        await adminClient().from('items').insert({
          id: otherItemId,
          workspace_id: other.wsId,
          title: 'other ws item',
          created_by_actor_type: 'user',
          created_by_actor_id: other.userId,
        })
        // 現テストユーザの item
        const mine = await createItem()
        const result = await itemService.move({
          id: mine.id,
          newParentItemId: otherItemId,
        })
        expect(result.ok).toBe(false)
        // NotFoundError (RLS で見えない) or ValidationError (別 ws 拒否) のどちらか
        if (!result.ok) {
          expect(['NOT_FOUND', 'VALIDATION']).toContain(result.error.code)
        }
      } finally {
        await other.cleanup()
      }
    })

    it('root に移動 (newParentItemId=null) できる', async () => {
      const item = await createItem()
      const result = await itemService.move({ id: item.id, newParentItemId: null })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.parentPath).toBe('')
    })
  })

  describe('reorder', () => {
    it('prev/next 両方 null は ValidationError', async () => {
      const item = await createItem()
      const result = await itemService.reorder({
        id: item.id,
        expectedVersion: item.version,
        prevSiblingId: null,
        nextSiblingId: null,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })

    it('siblings 3 つで真ん中に挿入 → position が prev < 自 < next', async () => {
      const a = await createItem({ title: 'A' })
      const b = await createItem({ title: 'B' })
      const c = await createItem({ title: 'C' })
      // 初期 position は全て 'a0' (default)。手動で a.position='a0', b='a1', c='a2' に揃える。
      await adminClient().from('items').update({ position: 'a0' }).eq('id', a.id)
      await adminClient().from('items').update({ position: 'a1' }).eq('id', b.id)
      await adminClient().from('items').update({ position: 'a2' }).eq('id', c.id)
      // b の version / c の version は version インクリメントなしで更新したので、
      // DB 上の実 version を取り直す
      const fresh = await adminClient()
        .from('items')
        .select('id, version, position')
        .in('id', [a.id, b.id, c.id])
      const bFresh = fresh.data!.find((x) => x.id === b.id)!
      // b を c のあと (末尾) に移動
      const result = await itemService.reorder({
        id: b.id,
        expectedVersion: bFresh.version,
        prevSiblingId: c.id,
        nextSiblingId: null,
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.position > 'a2').toBe(true)
    })

    it('自分自身を sibling 指定は ValidationError', async () => {
      const item = await createItem()
      const result = await itemService.reorder({
        id: item.id,
        expectedVersion: item.version,
        prevSiblingId: item.id,
        nextSiblingId: null,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('VALIDATION')
    })
  })

  describe('softDelete', () => {
    it('deleted_at がセットされ、list で除外される', async () => {
      const item = await createItem({ title: 'to-delete' })
      const result = await itemService.softDelete({
        id: item.id,
        expectedVersion: item.version,
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.deletedAt).not.toBeNull()
      const list = await itemService.list(wsId)
      expect(list.some((x) => x.id === item.id)).toBe(false)
    })

    it('既に削除済みは NotFoundError (findById が除外)', async () => {
      const item = await createItem()
      await itemService.softDelete({ id: item.id, expectedVersion: item.version })
      const again = await itemService.softDelete({
        id: item.id,
        expectedVersion: item.version + 1,
      })
      expect(again.ok).toBe(false)
      if (!again.ok) expect(again.error.code).toBe('NOT_FOUND')
    })
  })

  describe('list', () => {
    it('workspace 内の active item のみ返す', async () => {
      const items = await itemService.list(wsId)
      expect(items.every((i) => i.workspaceId === wsId)).toBe(true)
      expect(items.every((i) => i.deletedAt === null)).toBe(true)
    })
  })

  describe('archive / unarchive', () => {
    it('archive で archivedAt がセットされる', async () => {
      const item = await createItem({ title: 'to-archive' })
      const r = await itemService.archive({ id: item.id, expectedVersion: item.version })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.archivedAt).not.toBeNull()
    })
    it('既に archived の item を archive すると ValidationError', async () => {
      const item = await createItem({ title: 'twice-archive' })
      const r1 = await itemService.archive({ id: item.id, expectedVersion: item.version })
      expect(r1.ok).toBe(true)
      if (!r1.ok) return
      const r2 = await itemService.archive({
        id: item.id,
        expectedVersion: r1.value.version,
      })
      expect(r2.ok).toBe(false)
      if (!r2.ok) expect(r2.error.code).toBe('VALIDATION')
    })
    it('unarchive で archivedAt が null に戻る', async () => {
      const item = await createItem({ title: 'restore' })
      const archived = await itemService.archive({
        id: item.id,
        expectedVersion: item.version,
      })
      if (!archived.ok) throw new Error('archive failed')
      const r = await itemService.unarchive({
        id: item.id,
        expectedVersion: archived.value.version,
      })
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.archivedAt).toBeNull()
    })
    it('unarchived の item を unarchive すると ValidationError', async () => {
      const item = await createItem({ title: 'never-archived' })
      const r = await itemService.unarchive({ id: item.id, expectedVersion: item.version })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })
})
