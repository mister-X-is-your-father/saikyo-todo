/**
 * Phase 6.15 iter108: personal_period_goal service test。
 * 実 Supabase + RLS を通す (vi.mock で guard だけ stub)。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConflictError } from '@/lib/errors'

import { personalPeriodGoalService } from './service'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard')

describe('personalPeriodGoalService', () => {
  let wsId: string
  let userId: string
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const setup = await createTestUserAndWorkspace('ppgoal')
    wsId = setup.wsId
    userId = setup.userId
    cleanup = setup.cleanup
    await mockAuthGuards(userId, setup.email, 'member')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanup()
  })

  it('upsert: 新規 insert (expectedVersion=0)', async () => {
    const r = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'day',
      periodKey: '2026-04-27',
      text: '今日のゴール',
      expectedVersion: 0,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.text).toBe('今日のゴール')
    expect(r.value.version).toBe(0)
  })

  it('upsert: 既存を更新すると version が +1 される', async () => {
    const c = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'week',
      periodKey: '2026-W18',
      text: 'v0',
      expectedVersion: 0,
    })
    if (!c.ok) throw c.error
    const u = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'week',
      periodKey: '2026-W18',
      text: 'v1',
      expectedVersion: c.value.version,
    })
    expect(u.ok).toBe(true)
    if (!u.ok) return
    expect(u.value.text).toBe('v1')
    expect(u.value.version).toBe(c.value.version + 1)
  })

  it('upsert: 楽観ロック衝突で ConflictError', async () => {
    const c = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'month',
      periodKey: '2026-04',
      text: 'first',
      expectedVersion: 0,
    })
    if (!c.ok) throw c.error
    const r = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'month',
      periodKey: '2026-04',
      text: 'wrong version',
      expectedVersion: 999,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('upsert: 新規 insert で expectedVersion != 0 は ConflictError', async () => {
    const r = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'day',
      periodKey: '2099-01-01',
      text: 'should fail',
      expectedVersion: 1,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('CONFLICT')
  })

  it('get: 存在しない period_key は null を返す', async () => {
    const r = await personalPeriodGoalService.get({
      workspaceId: wsId,
      period: 'day',
      periodKey: '2099-12-31',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toBeNull()
  })

  it('upsert: バリデーション失敗 (text > 2000 chars)', async () => {
    const r = await personalPeriodGoalService.upsert({
      workspaceId: wsId,
      period: 'day',
      periodKey: '2026-04-27',
      text: 'x'.repeat(2001),
      expectedVersion: 0,
    })
    expect(r.ok).toBe(false)
  })
})
