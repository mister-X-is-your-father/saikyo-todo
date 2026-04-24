import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { timeEntryRepository } from './repository'
import { CreateTimeEntryInputSchema, ListTimeEntriesInputSchema, type TimeEntry } from './schema'

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
}
