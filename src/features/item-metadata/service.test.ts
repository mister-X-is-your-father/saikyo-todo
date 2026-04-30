/**
 * itemMetadataService integration test.
 * 実 Supabase + RLS + audit_log を通す。auth guard のみ vi.mock。
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

import { itemMetadataService } from './service'

describe('itemMetadataService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('item-meta-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(title = 'meta target') {
    const r = await itemService.create({
      workspaceId: wsId,
      title,
      idempotencyKey: randomUUID(),
    })
    if (!r.ok) throw new Error(r.error.message)
    return r.value
  }

  describe('setGoal', () => {
    it('goal を設定できる', async () => {
      const item = await createItem('goal target')
      const r = await itemMetadataService.setGoal({
        id: item.id,
        expectedVersion: item.version,
        goal: 'チームに新方針を浸透させる',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.goal).toBe('チームに新方針を浸透させる')
      expect(r.value.version).toBe(item.version + 1)
    })

    it('goal を null に戻せる', async () => {
      const item = await createItem('goal nullable')
      const r1 = await itemMetadataService.setGoal({
        id: item.id,
        expectedVersion: item.version,
        goal: 'まずは設定',
      })
      if (!r1.ok) throw new Error(r1.error.message)
      const r2 = await itemMetadataService.setGoal({
        id: r1.value.id,
        expectedVersion: r1.value.version,
        goal: null,
      })
      expect(r2.ok).toBe(true)
      if (!r2.ok) return
      expect(r2.value.goal).toBeNull()
    })

    it('expectedVersion 不一致は ConflictError', async () => {
      const item = await createItem('goal conflict')
      const r = await itemMetadataService.setGoal({
        id: item.id,
        expectedVersion: 999,
        goal: 'will fail',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('CONFLICT')
    })

    it('goal 設定で audit_log set_goal が残る', async () => {
      const item = await createItem('goal audit')
      const r = await itemMetadataService.setGoal({
        id: item.id,
        expectedVersion: item.version,
        goal: 'audit対象',
      })
      if (!r.ok) throw new Error(r.error.message)
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type, target_id')
        .eq('target_id', item.id)
      expect(audits?.some((a) => a.action === 'set_goal')).toBe(true)
    })
  })

  describe('addArtifact / removeArtifact / listArtifacts', () => {
    it('input 成果物を追加して list で見える', async () => {
      const item = await createItem('artifact in')
      const r = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'input',
        label: '前提資料',
        url: 'https://example.com/spec.pdf',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.kind).toBe('input')
      expect(r.value.label).toBe('前提資料')
      const list = await itemMetadataService.listArtifacts(item.id)
      expect(list).toHaveLength(1)
      expect(list[0]?.id).toBe(r.value.id)
    })

    it('output 成果物を複数追加できる', async () => {
      const item = await createItem('artifact out multi')
      const r1 = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'output',
        label: '議事録',
      })
      const r2 = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'output',
        label: '提案書',
      })
      expect(r1.ok).toBe(true)
      expect(r2.ok).toBe(true)
      const list = await itemMetadataService.listArtifacts(item.id)
      const outputs = list.filter((a) => a.kind === 'output')
      expect(outputs).toHaveLength(2)
    })

    it('label 空文字は ValidationError', async () => {
      const item = await createItem('artifact bad')
      const r = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'input',
        label: '',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('removeArtifact で soft delete + list から消える', async () => {
      const item = await createItem('artifact rm')
      const created = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'output',
        label: '消える成果物',
      })
      if (!created.ok) throw new Error('precondition')
      const r = await itemMetadataService.removeArtifact({
        id: created.value.id,
        expectedVersion: created.value.version,
      })
      expect(r.ok).toBe(true)
      const list = await itemMetadataService.listArtifacts(item.id)
      expect(list.find((a) => a.id === created.value.id)).toBeUndefined()
    })

    it('audit_log create / delete が残る', async () => {
      const item = await createItem('artifact audit')
      const created = await itemMetadataService.addArtifact({
        itemId: item.id,
        kind: 'input',
        label: '監査対象',
      })
      if (!created.ok) throw new Error('precondition')
      await itemMetadataService.removeArtifact({
        id: created.value.id,
        expectedVersion: created.value.version,
      })
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type, target_id')
        .eq('target_id', created.value.id)
      const actions = (audits ?? []).map((a) => a.action)
      expect(actions).toContain('create')
      expect(actions).toContain('delete')
    })
  })

  describe('addStakeholder / removeStakeholder / listStakeholders', () => {
    it('自分を関係者として追加できる (idempotent)', async () => {
      const item = await createItem('stakeholder add')
      const r1 = await itemMetadataService.addStakeholder({
        itemId: item.id,
        userId,
      })
      expect(r1.ok).toBe(true)
      // 2 回目: 既存を返す (idempotent)
      const r2 = await itemMetadataService.addStakeholder({
        itemId: item.id,
        userId,
      })
      expect(r2.ok).toBe(true)
      const list = await itemMetadataService.listStakeholders(item.id)
      expect(list).toHaveLength(1)
      expect(list[0]?.userId).toBe(userId)
    })

    it('workspace member ではない user を追加すると ValidationError', async () => {
      const item = await createItem('stakeholder bad')
      const r = await itemMetadataService.addStakeholder({
        itemId: item.id,
        userId: '00000000-0000-0000-0000-000000000000',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('removeStakeholder で消える', async () => {
      const item = await createItem('stakeholder rm')
      await itemMetadataService.addStakeholder({ itemId: item.id, userId })
      const r = await itemMetadataService.removeStakeholder({
        itemId: item.id,
        userId,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.removed).toBe(true)
      const list = await itemMetadataService.listStakeholders(item.id)
      expect(list).toHaveLength(0)
    })
  })
})
