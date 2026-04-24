/**
 * heartbeatService integration test。実 Supabase で notifications を確認。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import { daysUntilDue, heartbeatService, stageForDays } from './service'

function isoDaysFromNow(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function createMustItem(
  wsId: string,
  actorId: string,
  dueOffsetDays: number,
  today: Date,
  title = 'heartbeat-target',
): Promise<string> {
  const ac = adminClient()
  const { data, error } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title,
      description: '',
      status: 'todo',
      is_must: true,
      dod: 'criteria',
      due_date: isoDaysFromNow(today, dueOffsetDays),
      created_by_actor_type: 'user',
      created_by_actor_id: actorId,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert failed')
  return data.id
}

describe('daysUntilDue (pure)', () => {
  it('同日 → 0、翌日 → 1、昨日 → -1', () => {
    const base = new Date('2026-04-24T12:00:00Z')
    expect(daysUntilDue('2026-04-24', base)).toBe(0)
    expect(daysUntilDue('2026-04-25', base)).toBe(1)
    expect(daysUntilDue('2026-04-23', base)).toBe(-1)
    expect(daysUntilDue('2026-05-01', base)).toBe(7)
  })
})

describe('stageForDays (pure)', () => {
  it('7d: 4-7 日後、3d: 2-3 日後、1d: 0-1 日、それ以上は null', () => {
    expect(stageForDays(8)).toBeNull()
    expect(stageForDays(7)).toBe('7d')
    expect(stageForDays(4)).toBe('7d')
    expect(stageForDays(3)).toBe('3d')
    expect(stageForDays(2)).toBe('3d')
    expect(stageForDays(1)).toBe('1d')
    expect(stageForDays(0)).toBe('1d')
    expect(stageForDays(-3)).toBe('1d')
  })
})

describe('heartbeatService.scanWorkspace', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('heartbeat')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
  })

  afterAll(async () => {
    await cleanup()
  })

  it('7d stage 該当 Item で member 全員に通知が 1 件ずつ', async () => {
    const today = new Date('2026-04-24T00:00:00Z')
    const itemId = await createMustItem(wsId, userId, 5, today, 'item-7d')

    const r = await heartbeatService.scanWorkspace(wsId, { today })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.itemsEvaluated).toBeGreaterThanOrEqual(1)
    expect(r.value.notificationsCreated).toBeGreaterThanOrEqual(1)

    const ac = adminClient()
    const { data: notifs } = await ac
      .from('notifications')
      .select('payload, type')
      .eq('workspace_id', wsId)
      .eq('user_id', userId)
      .eq('type', 'heartbeat')
    const matched = notifs?.find((n) => (n.payload as { itemId?: string })?.itemId === itemId)
    expect(matched).toBeTruthy()
    expect((matched?.payload as { stage?: string })?.stage).toBe('7d')
  })

  it('2 回実行しても同 item+stage の通知は重複しない (冪等)', async () => {
    const today = new Date('2026-04-24T00:00:00Z')
    await createMustItem(wsId, userId, 1, today, 'item-1d-dedup')

    const first = await heartbeatService.scanWorkspace(wsId, { today })
    const second = await heartbeatService.scanWorkspace(wsId, { today })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    // 2 回目は skip のみ (created=0)
    expect(second.value.notificationsCreated).toBe(0)
    expect(second.value.notificationsSkipped).toBeGreaterThanOrEqual(
      first.value.notificationsCreated,
    )
  })

  it('MUST でない Item や done Item は対象外', async () => {
    const today = new Date('2026-04-24T00:00:00Z')
    const ac = adminClient()
    // MUST でない
    await ac
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'non-must',
        description: '',
        status: 'todo',
        is_must: false,
        due_date: isoDaysFromNow(today, 1),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .throwOnError()
    // done Item
    await ac
      .from('items')
      .insert({
        workspace_id: wsId,
        title: 'done-must',
        description: '',
        status: 'done',
        is_must: true,
        dod: 'x',
        due_date: isoDaysFromNow(today, 1),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .throwOnError()

    const r = await heartbeatService.scanWorkspace(wsId, { today })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // non-must / done-must は itemsEvaluated に含まれない
    // (itemsEvaluated は MUST + done 以外 + dueDate あり なので)
    // 厳密値は他のテスト生成物が混ざるため、notifications テーブル側でチェックする
    const ac2 = adminClient()
    const { data: notifs } = await ac2
      .from('notifications')
      .select('payload')
      .eq('workspace_id', wsId)
      .eq('type', 'heartbeat')
    const titles = new Set<string>()
    for (const n of notifs ?? []) {
      const p = n.payload as { itemId?: string }
      if (p.itemId) {
        const { data: i } = await adminClient()
          .from('items')
          .select('title')
          .eq('id', p.itemId)
          .single()
        if (i) titles.add(i.title)
      }
    }
    expect(titles.has('non-must')).toBe(false)
    expect(titles.has('done-must')).toBe(false)
  })

  it('due が 10 日先 → 通知なし (stage 該当なし)', async () => {
    const today = new Date('2026-04-24T00:00:00Z')
    await createMustItem(wsId, userId, 10, today, 'item-far')

    const r = await heartbeatService.scanWorkspace(wsId, { today })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const ac = adminClient()
    const { data: notifs } = await ac
      .from('notifications')
      .select('payload')
      .eq('workspace_id', wsId)
      .eq('type', 'heartbeat')
    const hasFar = (notifs ?? []).some(
      (n) => (n.payload as { daysUntilDue?: number })?.daysUntilDue === 10,
    )
    expect(hasFar).toBe(false)
  })
})

describe('heartbeatService.unreadCount', () => {
  it('未読 heartbeat だけカウント', async () => {
    const fx = await createTestUserAndWorkspace('heartbeat-unread')
    await mockAuthGuards(fx.userId, fx.email)
    const today = new Date('2026-04-24T00:00:00Z')
    await createMustItem(fx.wsId, fx.userId, 1, today)
    await heartbeatService.scanWorkspace(fx.wsId, { today })

    const c = await heartbeatService.unreadCount(fx.wsId, fx.userId)
    expect(c).toBeGreaterThanOrEqual(1)
    // 既読にすると 0 に減る
    const ac = adminClient()
    await ac
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('workspace_id', fx.wsId)
      .eq('user_id', fx.userId)
      .throwOnError()
    const c2 = await heartbeatService.unreadCount(fx.wsId, fx.userId)
    expect(c2).toBe(0)
    await fx.cleanup()
  })
})
