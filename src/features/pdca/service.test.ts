/**
 * pdcaService integration test (実 Supabase + RLS)。
 * - status 別の Plan/Do 集計
 * - 期間内の done で Check/Act 分類 (boundary 7d)
 * - lead time の avg/p50/p95
 * - daily throughput が空日も 0 で埋まる
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { pdcaService } from './service'

async function createItem(
  wsId: string,
  userId: string,
  status: 'todo' | 'in_progress' | 'done',
  options: {
    title?: string
    createdAt?: Date
    doneAt?: Date | null
  } = {},
): Promise<string> {
  const ac = adminClient()
  // status='done' で insert すると trigger items_done_at_sync が done_at を now() に
  // 上書きするので、insert 後に done_at + created_at を後乗せ UPDATE する
  // (trigger は `update of status` 限定なので status 以外の column 更新では発火しない)
  const insertData: Record<string, unknown> = {
    workspace_id: wsId,
    title: options.title ?? `pdca-${Date.now()}-${Math.random()}`,
    description: '',
    status,
    created_by_actor_type: 'user',
    created_by_actor_id: userId,
  }
  const { data, error } = await ac.from('items').insert(insertData).select('id').single()
  if (error || !data) throw error ?? new Error('insert failed')

  if (options.createdAt || options.doneAt) {
    const patch: Record<string, unknown> = {}
    if (options.createdAt) patch.created_at = options.createdAt.toISOString()
    if (options.doneAt) patch.done_at = options.doneAt.toISOString()
    const upd = await ac.from('items').update(patch).eq('id', data.id)
    if (upd.error) throw upd.error
  }
  return data.id
}

describe('pdcaService.summary', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('pdca')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(fx.userId, fx.email)
  })
  afterAll(async () => {
    await cleanup()
  })

  it('Plan/Do は active な status から、Check/Act は period 内 done で分かれる', async () => {
    const today = new Date()
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )
    const dayMs = 24 * 60 * 60 * 1000

    // Plan: 2 件、Do: 1 件
    await createItem(wsId, userId, 'todo', { title: 'P1' })
    await createItem(wsId, userId, 'todo', { title: 'P2' })
    await createItem(wsId, userId, 'in_progress', { title: 'D1' })

    // Check: doneAt が 3 日前 (boundary=7 日以内)
    const created3d = new Date(todayUtc.getTime() - 5 * dayMs)
    const done3d = new Date(todayUtc.getTime() - 3 * dayMs)
    await createItem(wsId, userId, 'done', {
      title: 'C1',
      createdAt: created3d,
      doneAt: done3d,
    })

    // Act: doneAt が 14 日前
    const created20d = new Date(todayUtc.getTime() - 20 * dayMs)
    const done14d = new Date(todayUtc.getTime() - 14 * dayMs)
    await createItem(wsId, userId, 'done', {
      title: 'A1',
      createdAt: created20d,
      doneAt: done14d,
    })

    const r = await pdcaService.summary(wsId, { checkWindowDays: 7 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.counts.plan).toBe(2)
    expect(r.value.counts.do).toBe(1)
    expect(r.value.counts.check).toBe(1)
    expect(r.value.counts.act).toBe(1)

    // lead time: C1 = 5-3 = 2 日, A1 = 20-14 = 6 日 → avg=4, p50=2 (idx=ceil(0.5*2)-1=0)
    expect(r.value.leadTimeDays.n).toBe(2)
    expect(r.value.leadTimeDays.avg).toBeCloseTo(4, 1)
    expect(r.value.leadTimeDays.p95).toBeCloseTo(6, 1)
  })

  it('daily 配列は from-to の連続日を 0 埋めで返す', async () => {
    const r = await pdcaService.summary(wsId, {
      from: '2026-04-20',
      to: '2026-04-25',
      checkWindowDays: 7,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.daily).toHaveLength(6) // 4/20, 21, 22, 23, 24, 25
    expect(r.value.daily[0]?.date).toBe('2026-04-20')
    expect(r.value.daily[5]?.date).toBe('2026-04-25')
  })

  it('item が 0 件でも壊れない (avg/p50/p95 = 0, n = 0)', async () => {
    const fx = await createTestUserAndWorkspace('pdca-empty')
    try {
      await mockAuthGuards(fx.userId, fx.email)
      const r = await pdcaService.summary(fx.wsId)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.value.counts).toEqual({ plan: 0, do: 0, check: 0, act: 0 })
      expect(r.value.leadTimeDays.n).toBe(0)
      expect(r.value.leadTimeDays.avg).toBe(0)
    } finally {
      await fx.cleanup()
    }
  })

  it('from > to は ValidationError', async () => {
    const r = await pdcaService.summary(wsId, { from: '2026-05-01', to: '2026-04-01' })
    expect(r.ok).toBe(false)
  })
})
