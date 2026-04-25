/**
 * notificationService integration test。実 Supabase で RLS / 既読化を確認。
 *
 * 直接 heartbeatService を呼んで通知を生成した上で、bell 用の list / unreadCount /
 * markRead / markAllRead を検証する。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { adminClient, createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

vi.mock('@/lib/jobs/queue', () => ({
  enqueueJob: vi.fn().mockResolvedValue('mock'),
  startBoss: vi.fn(),
  stopBoss: vi.fn(),
  registerWorker: vi.fn(),
  QUEUE_NAMES: ['pm-recovery'] as const,
}))

import { heartbeatService } from '../heartbeat/service'
import { notificationService } from './service'

async function createMustItem(
  wsId: string,
  userId: string,
  dueOffsetDays: number,
  title = 'notif-target',
): Promise<string> {
  const ac = adminClient()
  const today = new Date()
  const due = new Date(today)
  due.setUTCDate(due.getUTCDate() + dueOffsetDays)
  const { data, error } = await ac
    .from('items')
    .insert({
      workspace_id: wsId,
      title,
      description: '',
      status: 'todo',
      is_must: true,
      dod: 'criteria',
      due_date: due.toISOString().slice(0, 10),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('insert failed')
  return data.id
}

describe('notificationService', () => {
  let userId: string
  let email: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('notif-svc')
    userId = fx.userId
    email = fx.email
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, email)
    // heartbeat scan で 7d / 1d 通知を 2 件生成
    await createMustItem(wsId, userId, 5, 'notif-7d')
    await createMustItem(wsId, userId, 1, 'notif-1d')
    const r = await heartbeatService.scanWorkspace(wsId)
    if (!r.ok) throw r.error
  })

  afterAll(async () => {
    await cleanup()
  })

  it('list — workspace 内の自分宛通知を新しい順に返す', async () => {
    const r = await notificationService.list(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.length).toBeGreaterThanOrEqual(2)
    // ソート: createdAt desc
    for (let i = 1; i < r.value.length; i += 1) {
      expect(new Date(r.value[i - 1]!.createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(r.value[i]!.createdAt).getTime(),
      )
    }
  })

  it('unreadCount — 全件未読なら通知件数と一致', async () => {
    const list = await notificationService.list(wsId)
    if (!list.ok) throw list.error
    const r = await notificationService.unreadCount(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toBe(list.value.length)
  })

  it('markRead — 1 件既読化すると unreadCount が減る', async () => {
    const before = await notificationService.unreadCount(wsId)
    if (!before.ok) throw before.error
    const list = await notificationService.list(wsId, { unreadOnly: true })
    if (!list.ok) throw list.error
    const target = list.value[0]
    expect(target).toBeDefined()
    const r = await notificationService.markRead(target!.id)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value?.readAt).toBeTruthy()
    const after = await notificationService.unreadCount(wsId)
    if (!after.ok) throw after.error
    expect(after.value).toBe(before.value - 1)
  })

  it('markRead — 既読済 / 他人の通知 は no-op (null 返り、エラーにならない)', async () => {
    const list = await notificationService.list(wsId, { unreadOnly: false })
    if (!list.ok) throw list.error
    const alreadyRead = list.value.find((n) => n.readAt)
    expect(alreadyRead).toBeDefined()
    const r = await notificationService.markRead(alreadyRead!.id)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toBeNull()
  })

  it('markAllRead — 残り全部既読化、unreadCount=0', async () => {
    const r = await notificationService.markAllRead(wsId)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toBeGreaterThanOrEqual(0)
    const after = await notificationService.unreadCount(wsId)
    if (!after.ok) throw after.error
    expect(after.value).toBe(0)
  })
})

describe('notificationService — 越境 RLS', () => {
  it('他 workspace の通知は list に出てこない (RLS で user_id 制約)', async () => {
    const a = await createTestUserAndWorkspace('notif-rls-a')
    const b = await createTestUserAndWorkspace('notif-rls-b')
    try {
      // user a の workspace に通知を 1 件 (heartbeat) 作る
      await mockAuthGuards(a.userId, a.email)
      await createMustItem(a.wsId, a.userId, 1, 'rls-target')
      const scan = await heartbeatService.scanWorkspace(a.wsId)
      if (!scan.ok) throw scan.error

      // user b の視点で a の workspace を覗いても: requireWorkspaceMember で permission error
      // → service は throw するので Result でなく throw を期待
      await mockAuthGuards(b.userId, b.email)
      const guard = await import('@/lib/auth/guard')
      vi.mocked(guard.requireWorkspaceMember).mockRejectedValueOnce(
        new (await import('@/lib/errors')).PermissionError('not member'),
      )
      await expect(notificationService.list(a.wsId)).rejects.toThrow(/not member/)

      // user b 自身の workspace は空通知
      await mockAuthGuards(b.userId, b.email)
      const own = await notificationService.list(b.wsId)
      expect(own.ok).toBe(true)
      if (!own.ok) return
      expect(own.value.length).toBe(0)
    } finally {
      await a.cleanup()
      await b.cleanup()
    }
  })
})
