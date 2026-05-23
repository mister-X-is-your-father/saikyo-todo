import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { MS_PER_DAY, MS_PER_MINUTE } from '@/lib/date/iso'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { scheduleRepository } from './repository'
import {
  CreateScheduleInputSchema,
  ListSchedulesByDateInputSchema,
  MoveScheduleInputSchema,
  type Schedule,
  SoftDeleteScheduleInputSchema,
  StartTimerInputSchema,
  StopTimerInputSchema,
  UpdateScheduleInputSchema,
} from './schema'

const NOT_FOUND = 'Schedule が見つかりません'

/**
 * "YYYY-MM-DD" + workspace TZ から [dayStart, dayEnd) の UTC 範囲を作る。
 * Date.parse は ISO 文字列に TZ offset が無いと local 解釈になるので
 * ここでは workspace TZ を素直に Date オブジェクト化したいケースのみ。
 *
 * シンプル実装: TZ パラメータを渡さない場合は UTC 解釈する (worker 側の cron も
 * UTC 基準なので、ユーザの「今日」を見るときは client が TZ 込みで ISO datetime
 * を listByDateRange に渡す方式に切り替えても良い)。
 *
 * MVP では browser (client) が ISO datetime 範囲をそのまま渡す API も併用する。
 */
export function dayBoundsUtc(date: string): { from: Date; to: Date } {
  const from = new Date(`${date}T00:00:00.000Z`)
  const to = new Date(from.getTime() + MS_PER_DAY)
  return { from, to }
}

export const scheduleService = {
  async create(input: unknown): Promise<Result<Schedule>> {
    const parsed = CreateScheduleInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const { workspaceId, itemId, kind, startAt, endAt, note } = parsed.data
    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const created = await scheduleRepository.insert(tx, {
        workspaceId,
        itemId: itemId ?? null,
        kind,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        note: note ?? null,
        createdBy: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'schedule',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async update(input: unknown): Promise<Result<Schedule>> {
    const parsed = UpdateScheduleInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    return await mutateWithGuard<Schedule>({
      findById: (tx, id) => scheduleRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const patch: Partial<Parameters<typeof scheduleRepository.insert>[1]> = {}
        if (parsed.data.patch.itemId !== undefined) {
          patch.itemId = parsed.data.patch.itemId ?? null
        }
        if (parsed.data.patch.startAt !== undefined) {
          patch.startAt = new Date(parsed.data.patch.startAt)
        }
        if (parsed.data.patch.endAt !== undefined) {
          patch.endAt = new Date(parsed.data.patch.endAt)
        }
        if (parsed.data.patch.note !== undefined) {
          patch.note = parsed.data.patch.note ?? null
        }
        const finalStart = patch.startAt ?? before.startAt
        const finalEnd = patch.endAt ?? before.endAt
        if (finalEnd.getTime() <= finalStart.getTime()) {
          return err(new ValidationError('end は start より後にしてください'))
        }
        const updated = await scheduleRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          patch,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'schedule',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      },
    })
  },

  /**
   * Drag で start/end を 1 撃で動かす専用 path。move/resize 兼用。
   */
  async move(input: unknown): Promise<Result<Schedule>> {
    const parsed = MoveScheduleInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    return await mutateWithGuard<Schedule>({
      findById: (tx, id) => scheduleRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const updated = await scheduleRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          {
            startAt: new Date(parsed.data.startAt),
            endAt: new Date(parsed.data.endAt),
          },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'schedule',
          targetId: updated.id,
          action: 'move',
          before: { startAt: before.startAt, endAt: before.endAt },
          after: { startAt: updated.startAt, endAt: updated.endAt },
        })
        return ok(updated)
      },
    })
  },

  async softDelete(input: unknown): Promise<Result<Schedule>> {
    const parsed = SoftDeleteScheduleInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    return await mutateWithGuard<Schedule>({
      findById: (tx, id) => scheduleRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        const deleted = await scheduleRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!deleted) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'schedule',
          targetId: deleted.id,
          action: 'delete',
          before,
        })
        return ok(deleted)
      },
    })
  },

  /**
   * ▶ ボタン: 実測スロットを開始。end は仮で start + 1 分。
   * stopTimer で正確な end に更新する。
   */
  async startTimer(input: unknown): Promise<Result<Schedule>> {
    const parsed = StartTimerInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    const { workspaceId, itemId, note } = parsed.data
    const { user } = await requireWorkspaceMember(workspaceId, 'member')
    const start = parsed.data.startAt ? new Date(parsed.data.startAt) : new Date()
    // iter1150 refactor: 旧 inline `60 * 1000` (timer placeholder 1 min) を `MS_PER_MINUTE` に集約
    const placeholder = new Date(start.getTime() + MS_PER_MINUTE)

    return await withUserDb(user.id, async (tx) => {
      const created = await scheduleRepository.insert(tx, {
        workspaceId,
        itemId,
        kind: 'actual',
        startAt: start,
        endAt: placeholder,
        note: note ?? null,
        createdBy: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'schedule',
        targetId: created.id,
        action: 'start_timer',
        after: created,
      })
      return ok(created)
    })
  },

  /**
   * ■ ボタン: 実測スロットの end を確定。
   */
  async stopTimer(input: unknown): Promise<Result<Schedule>> {
    const parsed = StopTimerInputSchema.safeParse(input)
    if (!parsed.success) {
      return err(new ValidationError('入力内容を確認してください', parsed.error))
    }
    return await mutateWithGuard<Schedule>({
      findById: (tx, id) => scheduleRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
        if (before.kind !== 'actual') {
          return err(new ValidationError('実測スロットのみ停止できます'))
        }
        const end = parsed.data.endAt ? new Date(parsed.data.endAt) : new Date()
        if (end.getTime() <= before.startAt.getTime()) {
          return err(new ValidationError('end は start より後にしてください'))
        }
        const updated = await scheduleRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          { endAt: end },
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId: before.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'schedule',
          targetId: updated.id,
          action: 'stop_timer',
          before: { endAt: before.endAt },
          after: { endAt: updated.endAt },
        })
        return ok(updated)
      },
    })
  },

  async listByDate(input: unknown): Promise<Schedule[]> {
    const parsed = ListSchedulesByDateInputSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError('入力内容を確認してください', parsed.error)
    }
    const { workspaceId, date } = parsed.data
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    const { from, to } = dayBoundsUtc(date)
    return await withUserDb(user.id, async (tx) => {
      return await scheduleRepository.listByDateRange(tx, workspaceId, from, to)
    })
  },

  async findById(id: string): Promise<Schedule | null> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const row = await scheduleRepository.findById(tx, id)
      if (!row) return null
      await requireWorkspaceMember(row.workspaceId, 'viewer')
      return row
    })
  },
}
