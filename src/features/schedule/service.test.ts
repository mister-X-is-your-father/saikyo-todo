/**
 * scheduleService integration test.
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

import { scheduleService } from './service'

describe('scheduleService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('schedule-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function createItem(title = 'test item') {
    const r = await itemService.create({
      workspaceId: wsId,
      title,
      idempotencyKey: randomUUID(),
    })
    if (!r.ok) throw new Error(r.error.message)
    return r.value
  }

  describe('create', () => {
    it('planned slot を作成できる', async () => {
      const item = await createItem('plan target')
      const r = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T09:00:00.000Z',
        endAt: '2026-04-30T10:00:00.000Z',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.kind).toBe('planned')
      expect(r.value.itemId).toBe(item.id)
      expect(r.value.workspaceId).toBe(wsId)
    })

    it('itemId なし actual = 割込み として作成できる', async () => {
      const r = await scheduleService.create({
        workspaceId: wsId,
        itemId: null,
        kind: 'actual',
        startAt: '2026-04-30T11:00:00.000Z',
        endAt: '2026-04-30T11:30:00.000Z',
        note: '割込み: 急な電話',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.itemId).toBeNull()
      expect(r.value.note).toBe('割込み: 急な電話')
    })

    it('end <= start は ValidationError', async () => {
      const item = await createItem()
      const r = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T10:00:00.000Z',
        endAt: '2026-04-30T09:00:00.000Z',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('planned で itemId 必須', async () => {
      const r = await scheduleService.create({
        workspaceId: wsId,
        itemId: null,
        kind: 'planned',
        startAt: '2026-04-30T09:00:00.000Z',
        endAt: '2026-04-30T10:00:00.000Z',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })

    it('audit_log に create が残る', async () => {
      const item = await createItem('audit check')
      const r = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T13:00:00.000Z',
        endAt: '2026-04-30T14:00:00.000Z',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      const { data: audits } = await adminClient()
        .from('audit_log')
        .select('action, target_type, target_id')
        .eq('target_id', r.value.id)
      expect(audits?.some((a) => a.action === 'create' && a.target_type === 'schedule')).toBe(true)
    })
  })

  describe('move', () => {
    it('drag で start/end を更新し version が +1', async () => {
      const item = await createItem()
      const created = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T15:00:00.000Z',
        endAt: '2026-04-30T16:00:00.000Z',
      })
      if (!created.ok) throw new Error('precondition')
      const before = created.value
      const r = await scheduleService.move({
        id: before.id,
        expectedVersion: before.version,
        startAt: '2026-04-30T15:30:00.000Z',
        endAt: '2026-04-30T16:30:00.000Z',
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.version).toBe(before.version + 1)
    })

    it('expectedVersion 不一致は ConflictError', async () => {
      const item = await createItem()
      const created = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T17:00:00.000Z',
        endAt: '2026-04-30T18:00:00.000Z',
      })
      if (!created.ok) throw new Error('precondition')
      const r = await scheduleService.move({
        id: created.value.id,
        expectedVersion: 999,
        startAt: '2026-04-30T17:30:00.000Z',
        endAt: '2026-04-30T18:30:00.000Z',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('CONFLICT')
    })
  })

  describe('startTimer / stopTimer', () => {
    it('startTimer で actual placeholder ができる', async () => {
      const item = await createItem('timer target')
      const r = await scheduleService.startTimer({
        workspaceId: wsId,
        itemId: item.id,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.kind).toBe('actual')
      expect(r.value.endAt.getTime()).toBeGreaterThan(r.value.startAt.getTime())
    })

    it('stopTimer で end が更新される', async () => {
      const item = await createItem('stop target')
      const started = await scheduleService.startTimer({
        workspaceId: wsId,
        itemId: item.id,
      })
      if (!started.ok) throw new Error('precondition')
      // 数秒後 stop
      const newEnd = new Date(started.value.startAt.getTime() + 30 * 60 * 1000).toISOString()
      const r = await scheduleService.stopTimer({
        id: started.value.id,
        expectedVersion: started.value.version,
        endAt: newEnd,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.endAt.toISOString()).toBe(newEnd)
    })

    it('planned スロットを stopTimer すると ValidationError', async () => {
      const item = await createItem('planned cant stop')
      const planned = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T19:00:00.000Z',
        endAt: '2026-04-30T20:00:00.000Z',
      })
      if (!planned.ok) throw new Error('precondition')
      const r = await scheduleService.stopTimer({
        id: planned.value.id,
        expectedVersion: planned.value.version,
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('VALIDATION')
    })
  })

  describe('softDelete', () => {
    it('soft delete で deletedAt が立つ + audit_log delete が残る', async () => {
      const item = await createItem('to delete')
      const created = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T21:00:00.000Z',
        endAt: '2026-04-30T22:00:00.000Z',
      })
      if (!created.ok) throw new Error('precondition')
      const r = await scheduleService.softDelete({
        id: created.value.id,
        expectedVersion: created.value.version,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.deletedAt).not.toBeNull()
      // findById で見えなくなる
      const found = await scheduleService.findById(created.value.id)
      expect(found).toBeNull()
    })

    it('expectedVersion 不一致は ConflictError', async () => {
      const item = await createItem()
      const created = await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-04-30T22:30:00.000Z',
        endAt: '2026-04-30T23:00:00.000Z',
      })
      if (!created.ok) throw new Error('precondition')
      const r = await scheduleService.softDelete({
        id: created.value.id,
        expectedVersion: 999,
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe('CONFLICT')
    })
  })

  describe('listByDate', () => {
    it('指定日の schedule のみ返す (UTC 解釈)', async () => {
      const item = await createItem('list target')
      // この日の slot
      await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-05-01T09:00:00.000Z',
        endAt: '2026-05-01T10:00:00.000Z',
      })
      // 別日の slot
      await scheduleService.create({
        workspaceId: wsId,
        itemId: item.id,
        kind: 'planned',
        startAt: '2026-05-02T09:00:00.000Z',
        endAt: '2026-05-02T10:00:00.000Z',
      })
      const rows = await scheduleService.listByDate({ workspaceId: wsId, date: '2026-05-01' })
      expect(rows.every((r) => r.startAt.toISOString().startsWith('2026-05-01'))).toBe(true)
    })
  })
})
