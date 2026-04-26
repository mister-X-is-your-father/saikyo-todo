/**
 * pg-boss 'time-entry-sync' キュー handler。1 job = 1 time_entry。
 *
 * 流れ:
 *   1. entryId から time_entry を引く (admin)
 *   2. pending のみ処理 (再 enqueue で重複してもスキップ)
 *   3. driver (Playwright) で mock_timesheet に送信
 *   4. 成功 → synced + external_ref / 失敗 → failed + sync_error
 *   5. audit 記録
 *
 * driver は DI 可能。テストでは mock driver、本番では playwrightMockDriver。
 */
import 'server-only'

import { eq } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { timeEntries } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import type { TimeEntrySyncJobData } from '@/lib/jobs/queue'

import { notifySyncFailureEmail } from '@/features/email/notify'
import { getMockCredentials } from '@/features/mock-timesheet/service'
import { notificationRepository } from '@/features/notification/repository'
import type { SyncFailurePayload } from '@/features/notification/schema'

import {
  minutesToHoursDecimal,
  playwrightMockDriver,
  type TimesheetDriver,
} from './playwright-driver'

const DEFAULT_BASE_URL = process.env.MOCK_TIMESHEET_BASE_URL ?? 'http://localhost:3001'

export interface TimeEntryWorkerConfig {
  driver?: TimesheetDriver // DI (テスト用)
  baseUrl?: string
}

export function createTimeEntryWorker(config: TimeEntryWorkerConfig = {}) {
  const driver = config.driver ?? playwrightMockDriver
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  return async function handleTimeEntrySync(
    jobs: Array<{ id: string; data: TimeEntrySyncJobData }>,
  ): Promise<void> {
    for (const job of jobs) {
      const { entryId } = job.data
      const short = entryId.slice(0, 8)
      try {
        await processOne(entryId, driver, baseUrl)
        console.log(`[time-entry-sync] entry=${short} ok`)
      } catch (e) {
        // error は processOne 内で DB に failed 記録済み。ここは retry を誘発しないため throw しない
        console.error(`[time-entry-sync] entry=${short} unexpected:`, e)
      }
    }
  }
}

async function processOne(
  entryId: string,
  driver: TimesheetDriver,
  baseUrl: string,
): Promise<void> {
  const entry = await adminDb.transaction(async (tx) => {
    const rows = await tx.select().from(timeEntries).where(eq(timeEntries.id, entryId)).limit(1)
    return rows[0] ?? null
  })
  if (!entry) {
    console.warn(`[time-entry-sync] entry=${entryId.slice(0, 8)} not found`)
    return
  }
  if (entry.syncStatus !== 'pending') {
    console.log(
      `[time-entry-sync] entry=${entryId.slice(0, 8)} skipped (status=${entry.syncStatus})`,
    )
    return
  }

  const creds = getMockCredentials()

  try {
    const result = await driver(
      { baseUrl, email: creds.email, password: creds.password },
      {
        workDate: entry.workDate,
        category: entry.category,
        description: entry.description,
        hoursDecimal: minutesToHoursDecimal(entry.durationMinutes),
      },
    )

    await adminDb.transaction(async (tx) => {
      await tx
        .update(timeEntries)
        .set({ syncStatus: 'synced', externalRef: result.externalRef, syncError: null })
        .where(eq(timeEntries.id, entryId))
      await recordAudit(tx, {
        workspaceId: entry.workspaceId,
        actorType: 'user',
        actorId: entry.userId,
        targetType: 'time_entry',
        targetId: entryId,
        action: 'sync_success',
        after: { externalRef: result.externalRef },
      })
    })
  } catch (e) {
    const errorMessage = (e instanceof Error ? e.message : String(e)).slice(0, 2000)
    await adminDb.transaction(async (tx) => {
      await tx
        .update(timeEntries)
        .set({ syncStatus: 'failed', syncError: errorMessage })
        .where(eq(timeEntries.id, entryId))
      await recordAudit(tx, {
        workspaceId: entry.workspaceId,
        actorType: 'user',
        actorId: entry.userId,
        targetType: 'time_entry',
        targetId: entryId,
        action: 'sync_failed',
        after: { errorMessage },
      })
    })
    // sync-failure 通知 (best-effort: 失敗状態の commit を先に確定させてから別 Tx で発行。
    //   同 Tx に入れて notification 側が失敗すると failed/audit が roll back されかねない)
    let inAppOk = false
    try {
      const payload: SyncFailurePayload = {
        source: 'time-entry',
        reason: errorMessage,
        entryId,
      }
      await adminDb.transaction(async (tx) => {
        await notificationRepository.insert(tx, {
          userId: entry.userId,
          workspaceId: entry.workspaceId,
          type: 'sync-failure',
          payload: payload as unknown as Record<string, unknown>,
        })
      })
      inAppOk = true
    } catch (notifyErr) {
      console.error(
        `[time-entry-sync] sync-failure notification emit failed entry=${entryId.slice(0, 8)}`,
        notifyErr,
      )
    }

    // email 配信は in-app 通知が出せた時のみ追従 (pref デフォルト OFF)。
    // notify* は内部で try/catch する best-effort 設計
    if (inAppOk) {
      await notifySyncFailureEmail({
        userId: entry.userId,
        workspaceId: entry.workspaceId,
        source: 'time-entry',
        reason: errorMessage,
        entryId,
      })
    }
  }
}
