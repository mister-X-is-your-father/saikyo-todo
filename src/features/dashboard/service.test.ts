/**
 * dashboardService integration test (実 Supabase + RLS + audit_log)。
 * auth guard だけ vi.mock。
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

import { dashboardService } from './service'

describe('dashboardService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('dashboard-svc')
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
    const r = await itemService.create({
      workspaceId: wsId,
      title: 'dash test',
      idempotencyKey: randomUUID(),
      ...overrides,
    })
    if (!r.ok) throw new Error(`create failed: ${r.error.message}`)
    return r.value
  }

  describe('getMustSummary', () => {
    it('MUST item だけを返し、非 MUST は含まない', async () => {
      const must = await createItem({ title: 'must 1', isMust: true, dod: 'dod' })
      await createItem({ title: 'nonmust' }) // non-MUST は除外される

      const summary = await dashboardService.getMustSummary(wsId)
      const ids = summary.items.map((i) => i.id)
      expect(ids).toContain(must.id)
      expect(summary.items.every((i) => i.isMust)).toBe(true)
    })

    it('wipLimit は workspace_settings から取得 (既定 5)', async () => {
      const summary = await dashboardService.getMustSummary(wsId)
      expect(summary.wipLimit).toBe(5)
    })

    it('in_progress type の MUST 数を wipInProgress で返す', async () => {
      const a = await createItem({ title: 'wip a', isMust: true, dod: 'dod' })
      const b = await createItem({ title: 'wip b', isMust: true, dod: 'dod' })
      // a を in_progress に
      const upd = await itemService.updateStatus({
        id: a.id,
        expectedVersion: a.version,
        status: 'in_progress',
      })
      expect(upd.ok).toBe(true)
      // b は todo のまま
      expect(b.status).toBe('todo')

      const summary = await dashboardService.getMustSummary(wsId)
      // 他 test の MUST も存在しうるので >= 1 で検証
      expect(summary.wipInProgress).toBeGreaterThanOrEqual(1)
    })

    it('wipLimit を 1 に下げて wipExceeded=true になる', async () => {
      // wip_limit_must を 1 に
      await adminClient()
        .from('workspace_settings')
        .update({ wip_limit_must: 1 })
        .eq('workspace_id', wsId)
      // MUST + in_progress を 2 つ用意
      const x = await createItem({ title: 'x', isMust: true, dod: 'd' })
      const y = await createItem({ title: 'y', isMust: true, dod: 'd' })
      await itemService.updateStatus({
        id: x.id,
        expectedVersion: x.version,
        status: 'in_progress',
      })
      await itemService.updateStatus({
        id: y.id,
        expectedVersion: y.version,
        status: 'in_progress',
      })

      const summary = await dashboardService.getMustSummary(wsId)
      expect(summary.wipLimit).toBe(1)
      expect(summary.wipInProgress).toBeGreaterThanOrEqual(2)
      expect(summary.wipExceeded).toBe(true)

      // クリーンアップ: wip_limit_must を戻す
      await adminClient()
        .from('workspace_settings')
        .update({ wip_limit_must: 5 })
        .eq('workspace_id', wsId)
    })

    it('overdueCount: due_date < today かつ未完了の MUST', async () => {
      const overdue = await createItem({
        title: 'overdue',
        isMust: true,
        dod: 'd',
        dueDate: '2020-01-01',
      })
      const summary = await dashboardService.getMustSummary(wsId)
      expect(summary.overdueCount).toBeGreaterThanOrEqual(1)
      expect(summary.items.some((i) => i.id === overdue.id)).toBe(true)
    })
  })

  describe('getBurndown', () => {
    it('default 14 日分の点を返す (date 昇順)', async () => {
      const points = await dashboardService.getBurndown({ workspaceId: wsId, days: 14 })
      expect(points).toHaveLength(14)
      for (let i = 1; i < points.length; i++) {
        expect(points[i]!.date > points[i - 1]!.date).toBe(true)
      }
    })

    it('MUST を作成→done にすると最終日の closed が 1 増える', async () => {
      // 新しい workspace で clean に検証
      const other = await createTestUserAndWorkspace('dash-burn')
      await mockAuthGuards(other.userId, other.email)
      try {
        const before = await dashboardService.getBurndown({ workspaceId: other.wsId, days: 7 })
        const beforeLastClosed = before[before.length - 1]!.closed

        const it1 = await itemService.create({
          workspaceId: other.wsId,
          title: 'closed-must',
          isMust: true,
          dod: 'd',
          idempotencyKey: randomUUID(),
        })
        if (!it1.ok) throw new Error(it1.error.message)
        const r = await itemService.updateStatus({
          id: it1.value.id,
          expectedVersion: it1.value.version,
          status: 'done',
        })
        expect(r.ok).toBe(true)

        const after = await dashboardService.getBurndown({ workspaceId: other.wsId, days: 7 })
        expect(after[after.length - 1]!.closed).toBe(beforeLastClosed + 1)
      } finally {
        // mockAuthGuards を元の user に戻す
        await mockAuthGuards(userId, email)
        await other.cleanup()
      }
    })

    it('days の zod バリデーション: 0 は弾かれる', async () => {
      await expect(dashboardService.getBurndown({ workspaceId: wsId, days: 0 })).rejects.toThrow()
    })
  })
})
