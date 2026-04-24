/**
 * timeEntryService integration test (Phase 0).
 * 実 Supabase + RLS を通す。auth guard だけ vi.mock。
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { timeEntryService } from './service'

describe('timeEntryService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('te-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  describe('create', () => {
    it('happy path: 作成すると pending で返り、list に含まれる', async () => {
      const r = await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026-04-24',
        category: 'dev',
        description: 'カテゴリを整理した',
        durationMinutes: 90,
        idempotencyKey: randomUUID(),
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.syncStatus).toBe('pending')
      expect(r.value.workspaceId).toBe(wsId)
      expect(r.value.userId).toBe(userId)
      expect(r.value.durationMinutes).toBe(90)
    })

    it('MUST なカテゴリ以外も通る (enum 内ならすべて可)', async () => {
      for (const cat of ['meeting', 'research', 'ops', 'other'] as const) {
        const r = await timeEntryService.create({
          workspaceId: wsId,
          workDate: '2026-04-24',
          category: cat,
          description: `category=${cat}`,
          durationMinutes: 30,
          idempotencyKey: randomUUID(),
        })
        expect(r.ok, `category=${cat}`).toBe(true)
      }
    })

    it('不正カテゴリは ValidationError', async () => {
      const r = await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026-04-24',
        category: 'invalid' as never,
        description: '',
        durationMinutes: 30,
        idempotencyKey: randomUUID(),
      })
      expect(r.ok).toBe(false)
      if (r.ok) return
      expect(r.error.code).toBe('VALIDATION')
    })

    it('duration 0 や負値は ValidationError', async () => {
      const r = await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026-04-24',
        category: 'dev',
        description: '',
        durationMinutes: 0,
        idempotencyKey: randomUUID(),
      })
      expect(r.ok).toBe(false)
    })

    it('workDate が不正フォーマットは ValidationError', async () => {
      const r = await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026/04/24' as never,
        category: 'dev',
        description: '',
        durationMinutes: 30,
        idempotencyKey: randomUUID(),
      })
      expect(r.ok).toBe(false)
    })
  })

  describe('list', () => {
    it('workspace 内の entry を work_date 新しい順で返す', async () => {
      // まず 2 件作る (日付違い)
      await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026-04-20',
        category: 'dev',
        description: '古い',
        durationMinutes: 15,
        idempotencyKey: randomUUID(),
      })
      await timeEntryService.create({
        workspaceId: wsId,
        workDate: '2026-04-25',
        category: 'dev',
        description: '新しい',
        durationMinutes: 15,
        idempotencyKey: randomUUID(),
      })

      const r = await timeEntryService.list({ workspaceId: wsId, limit: 100 })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      const dates = r.value.map((e) => e.workDate)
      const sorted = [...dates].sort((a, b) => b.localeCompare(a))
      expect(dates).toEqual(sorted)
    })

    it('from / to で絞り込める', async () => {
      const r = await timeEntryService.list({
        workspaceId: wsId,
        from: '2026-04-24',
        to: '2026-04-25',
        limit: 100,
      })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.every((e) => e.workDate >= '2026-04-24' && e.workDate <= '2026-04-25')).toBe(
        true,
      )
    })
  })

  describe('越境防御 (別 workspace のユーザは書けない)', () => {
    it('別 user + workspace を作って、user1 のガードで user2 の ws に insert しようとすると RLS で弾かれる', async () => {
      const fx2 = await createTestUserAndWorkspace('te-other')
      try {
        // drizzle は DrizzleQueryError でラップするので cause の Postgres error を見る
        let caught: unknown
        try {
          await timeEntryService.create({
            workspaceId: fx2.wsId,
            workDate: '2026-04-24',
            category: 'dev',
            description: '越境攻撃',
            durationMinutes: 10,
            idempotencyKey: randomUUID(),
          })
        } catch (e) {
          caught = e
        }
        expect(caught).toBeInstanceOf(Error)
        const cause = (caught as { cause?: { code?: string; message?: string } })?.cause
        expect(cause?.code).toBe('42501') // insufficient_privilege (RLS)
      } finally {
        await fx2.cleanup()
      }
    })
  })
})
