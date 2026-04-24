import 'server-only'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { timeEntries } from '@/lib/db/schema'
import { adminDb, withUserDb } from '@/lib/db/scoped-client'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'

import { timeEntryRepository } from './repository'
import { CreateTimeEntryInputSchema, ListTimeEntriesInputSchema, type TimeEntry } from './schema'

const MAX_SYNC_ATTEMPTS = 3

const SyncEntryInputSchema = z.object({
  workspaceId: z.string().uuid(),
  id: z.string().uuid(),
})

export const timeEntryService = {
  async create(input: unknown): Promise<Result<TimeEntry>> {
    const parsed = CreateTimeEntryInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const v = parsed.data

    const { user } = await requireWorkspaceMember(v.workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const row = await timeEntryRepository.insert(tx, {
        workspaceId: v.workspaceId,
        userId: user.id,
        itemId: v.itemId ?? null,
        workDate: v.workDate,
        category: v.category,
        description: v.description,
        durationMinutes: v.durationMinutes,
      })
      await recordAudit(tx, {
        workspaceId: v.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'time_entry',
        targetId: row.id,
        action: 'create',
        after: {
          workDate: row.workDate,
          category: row.category,
          durationMinutes: row.durationMinutes,
          itemId: row.itemId,
        },
      })
      return ok(row)
    })
  },

  async list(input: unknown): Promise<Result<TimeEntry[]>> {
    const parsed = ListTimeEntriesInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, from, to, limit } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await timeEntryRepository.list(tx, {
        workspaceId,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        limit,
      })
      return ok(rows)
    })
  },

  /**
   * time_entry を sync キューに流す。pending / failed のみ対象。
   * 既に synced / 上限 (3) 到達は ValidationError。
   *
   * 実際の Playwright 操作は Phase 3 の worker で行う。ここでは enqueue だけ。
   */
  async enqueueSync(input: unknown): Promise<Result<TimeEntry>> {
    const parsed = SyncEntryInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, id } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    const result = await adminDb.transaction(async (tx) => {
      const current = await timeEntryRepository.findById(tx, id)
      if (!current) return err(new NotFoundError('time_entry が見つかりません'))
      if (current.workspaceId !== workspaceId) {
        return err(new ValidationError('workspace が一致しません'))
      }
      if (current.userId !== user.id) {
        return err(new ValidationError('他ユーザの time_entry は sync できません'))
      }
      if (current.syncStatus === 'synced') {
        return err(new ValidationError('既に sync 済みです'))
      }
      if (current.syncAttempts >= MAX_SYNC_ATTEMPTS) {
        return err(new ValidationError('リトライ上限に達しました'))
      }
      // 再 sync 時は status を pending に戻して attempts++
      const [updated] = await tx
        .update(timeEntries)
        .set({
          syncStatus: 'pending',
          syncAttempts: current.syncAttempts + 1,
          syncError: null,
        })
        .where(eq(timeEntries.id, id))
        .returning()
      if (!updated) throw new Error('update returned no row')

      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'time_entry',
        targetId: id,
        action: 'enqueue_sync',
        after: { syncAttempts: updated.syncAttempts },
      })
      return ok(updated as TimeEntry)
    })

    if (!result.ok) return result
    // Tx commit 後に enqueue (worker がピックして Phase 3 で処理)
    await enqueueJob('time-entry-sync', { entryId: id })
    return result
  },
}
