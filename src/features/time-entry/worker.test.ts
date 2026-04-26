/**
 * time-entry worker の単体テスト。
 * driver を mock 差し替えて、worker が:
 *   - pending のみ処理する
 *   - 成功時 synced + external_ref
 *   - 失敗時 failed + sync_error
 *   - audit (sync_success / sync_failed) が記録される
 * ことを確認する。
 */
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { auditLog, notifications, timeEntries } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'

import { createTestUserAndWorkspace, mockAuthGuards } from '@/test/fixtures'

vi.mock('@/lib/auth/guard', () => ({
  requireUser: vi.fn(),
  requireWorkspaceMember: vi.fn(),
  hasAtLeast: () => true,
}))

import type { TimesheetDriver } from './playwright-driver'
import { timeEntryService } from './service'
import { createTimeEntryWorker } from './worker'

describe('time-entry worker', () => {
  let userId: string
  let wsId: string
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const fx = await createTestUserAndWorkspace('te-worker')
    userId = fx.userId
    wsId = fx.wsId
    cleanup = fx.cleanup
    await mockAuthGuards(userId, fx.email)
  })

  afterAll(async () => {
    await cleanup()
  })

  async function makePendingEntry(): Promise<string> {
    const r = await timeEntryService.create({
      workspaceId: wsId,
      workDate: '2026-04-25',
      category: 'dev',
      description: 'テスト',
      durationMinutes: 30,
      idempotencyKey: randomUUID(),
    })
    if (!r.ok) throw r.error
    return r.value.id
  }

  it('成功 driver: synced + external_ref 記録 + sync_success audit', async () => {
    const entryId = await makePendingEntry()
    const externalRef = randomUUID()
    const driver: TimesheetDriver = vi.fn(async () => ({ externalRef }))

    const handle = createTimeEntryWorker({ driver, baseUrl: 'http://example.invalid' })
    await handle([{ id: 'job-1', data: { entryId } }])

    const rows = await adminDb.select().from(timeEntries).where(eq(timeEntries.id, entryId))
    expect(rows[0]?.syncStatus).toBe('synced')
    expect(rows[0]?.externalRef).toBe(externalRef)
    expect(rows[0]?.syncError).toBeNull()
    expect(driver).toHaveBeenCalledTimes(1)

    const audits = await adminDb
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.targetType, 'time_entry'), eq(auditLog.targetId, entryId)))
    expect(audits.some((a) => a.action === 'sync_success')).toBe(true)
  })

  it('失敗 driver: failed + error 記録 + sync_failed audit + sync-failure 通知', async () => {
    const entryId = await makePendingEntry()
    const driver: TimesheetDriver = vi.fn(async () => {
      throw new Error('mock-timesheet タイムアウト')
    })

    const handle = createTimeEntryWorker({ driver, baseUrl: 'http://example.invalid' })
    await handle([{ id: 'job-2', data: { entryId } }])

    const rows = await adminDb.select().from(timeEntries).where(eq(timeEntries.id, entryId))
    expect(rows[0]?.syncStatus).toBe('failed')
    expect(rows[0]?.syncError).toMatch(/タイムアウト/)
    expect(rows[0]?.externalRef).toBeNull()

    const audits = await adminDb
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.targetType, 'time_entry'), eq(auditLog.targetId, entryId)))
    expect(audits.some((a) => a.action === 'sync_failed')).toBe(true)

    // sync-failure 通知が time_entry の owner (= 本テストの test user) 宛に発火
    const notifs = await adminDb
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, 'sync-failure')))
    const matched = notifs.find((n) => (n.payload as { entryId?: string })?.entryId === entryId)
    expect(matched).toBeTruthy()
    expect((matched?.payload as { source?: string }).source).toBe('time-entry')
    expect((matched?.payload as { reason?: string }).reason).toMatch(/タイムアウト/)
  })

  it('既に synced の entry は driver を呼ばずスキップ', async () => {
    const entryId = await makePendingEntry()
    // 先に synced に更新
    await adminDb
      .update(timeEntries)
      .set({ syncStatus: 'synced', externalRef: 'pre-existing' })
      .where(eq(timeEntries.id, entryId))

    const driver: TimesheetDriver = vi.fn(async () => ({ externalRef: 'new-ref' }))
    const handle = createTimeEntryWorker({ driver, baseUrl: 'http://example.invalid' })
    await handle([{ id: 'job-3', data: { entryId } }])

    expect(driver).not.toHaveBeenCalled()
    const rows = await adminDb.select().from(timeEntries).where(eq(timeEntries.id, entryId))
    expect(rows[0]?.externalRef).toBe('pre-existing')
  })

  it('存在しない entryId でも throw しない', async () => {
    const driver: TimesheetDriver = vi.fn()
    const handle = createTimeEntryWorker({ driver, baseUrl: 'http://example.invalid' })
    await expect(
      handle([{ id: 'job-4', data: { entryId: randomUUID() } }]),
    ).resolves.toBeUndefined()
    expect(driver).not.toHaveBeenCalled()
  })
})
