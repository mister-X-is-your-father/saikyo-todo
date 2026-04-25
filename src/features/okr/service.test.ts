/**
 * okrService integration test (実 Supabase + RLS)。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { okrService } from './service'

async function createItemForKR(
  wsId: string,
  userId: string,
  keyResultId: string | null,
  status: 'todo' | 'in_progress' | 'done' = 'todo',
): Promise<string> {
  const ac = adminClient()
  const { data, error } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title: `kr-item-${Date.now()}`,
      description: '',
      status,
      key_result_id: keyResultId,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert item failed')
  return data.id
}

describe('okrService — Goal CRUD + KR + progress', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('okr')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('createGoal → list → audit に create 1 件', async () => {
    const r = await okrService.createGoal({
      workspaceId: wsId,
      title: 'Q2 2026: 速度改善',
      description: 'p95 を半分に',
      period: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.status).toBe('active')

    const list = await okrService.listGoals(wsId)
    if (!list.ok) throw list.error
    expect(list.value.some((g) => g.id === r.value.id)).toBe(true)

    const ac = adminClient()
    const { data: audits } = await ac
      .from('audit_log')
      .select('action')
      .eq('workspace_id', wsId)
      .eq('target_id', r.value.id)
    expect(audits?.some((a) => a.action === 'create')).toBe(true)
  })

  it('createGoal: start > end は ValidationError', async () => {
    const r = await okrService.createGoal({
      workspaceId: wsId,
      title: 'Bad',
      period: 'quarterly',
      startDate: '2026-06-30',
      endDate: '2026-04-01',
      idempotencyKey: crypto.randomUUID(),
    })
    expect(r.ok).toBe(false)
  })

  it('updateGoal: 楽観ロック衝突で ConflictError', async () => {
    const c = await okrService.createGoal({
      workspaceId: wsId,
      title: 'Lock test',
      period: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!c.ok) throw c.error
    const r = await okrService.updateGoal({
      id: c.value.id,
      expectedVersion: 999,
      patch: { title: 'X' },
    })
    expect(r.ok).toBe(false)
  })

  it('createKeyResult → listKeyResults', async () => {
    const g = await okrService.createGoal({
      workspaceId: wsId,
      title: 'KR target',
      period: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!g.ok) throw g.error
    const kr = await okrService.createKeyResult({
      goalId: g.value.id,
      title: 'KR1: p95 < 200ms',
      progressMode: 'items',
      weight: 5,
      idempotencyKey: crypto.randomUUID(),
    })
    expect(kr.ok).toBe(true)
    const list = await okrService.listKeyResults(g.value.id)
    if (!list.ok) throw list.error
    expect(list.value.length).toBeGreaterThanOrEqual(1)
  })

  it('progress: items mode で done 比 + weighted average', async () => {
    const g = await okrService.createGoal({
      workspaceId: wsId,
      title: 'Progress test',
      period: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!g.ok) throw g.error
    const kr1 = await okrService.createKeyResult({
      goalId: g.value.id,
      title: 'KR1',
      weight: 1,
      idempotencyKey: crypto.randomUUID(),
    })
    if (!kr1.ok) throw kr1.error
    const kr2 = await okrService.createKeyResult({
      goalId: g.value.id,
      title: 'KR2',
      weight: 3,
      idempotencyKey: crypto.randomUUID(),
    })
    if (!kr2.ok) throw kr2.error
    // KR1: done 1/2, KR2: done 0/1
    await createItemForKR(wsId, userId, kr1.value.id, 'done')
    await createItemForKR(wsId, userId, kr1.value.id, 'todo')
    await createItemForKR(wsId, userId, kr2.value.id, 'todo')

    const p = await okrService.goalProgress(g.value.id)
    if (!p.ok) throw p.error
    expect(p.value.keyResults).toHaveLength(2)
    const kr1p = p.value.keyResults.find((k) => k.krId === kr1.value.id)!
    const kr2p = p.value.keyResults.find((k) => k.krId === kr2.value.id)!
    expect(kr1p.pct).toBeCloseTo(0.5)
    expect(kr2p.pct).toBeCloseTo(0)
    // weighted average: (0.5*1 + 0*3) / (1+3) = 0.125
    expect(p.value.pct).toBeCloseTo(0.125)
  })

  it('progress: manual mode で current/target', async () => {
    const g = await okrService.createGoal({
      workspaceId: wsId,
      title: 'Manual mode',
      period: 'quarterly',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      idempotencyKey: crypto.randomUUID(),
    })
    if (!g.ok) throw g.error
    const kr = await okrService.createKeyResult({
      goalId: g.value.id,
      title: 'manual KR',
      progressMode: 'manual',
      currentValue: 30,
      targetValue: 100,
      unit: '件',
      weight: 1,
      idempotencyKey: crypto.randomUUID(),
    })
    if (!kr.ok) throw kr.error
    const p = await okrService.goalProgress(g.value.id)
    if (!p.ok) throw p.error
    expect(p.value.pct).toBeCloseTo(0.3)
  })

  it('assignItemToKeyResult: 別 ws の KR は弾く', async () => {
    const other = await createTestUserAndWorkspace('okr-other')
    try {
      await mockAuthGuards(other.userId, other.email)
      const og = await okrService.createGoal({
        workspaceId: other.wsId,
        title: 'other ws goal',
        period: 'quarterly',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        idempotencyKey: crypto.randomUUID(),
      })
      if (!og.ok) throw og.error
      const okr = await okrService.createKeyResult({
        goalId: og.value.id,
        title: 'okr',
        idempotencyKey: crypto.randomUUID(),
      })
      if (!okr.ok) throw okr.error

      // 元 ws actor に戻す
      await mockAuthGuards(userId, 'okr@example.com')
      const itemId = await createItemForKR(wsId, userId, null)
      const r = await okrService.assignItemToKeyResult({
        itemId,
        keyResultId: okr.value.id,
      })
      expect(r.ok).toBe(false)
    } finally {
      await other.cleanup()
    }
  })
})
