import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { ISO_DATE_RE, MS_PER_DAY } from '@/lib/date/iso'
import { itemSchedules } from '@/lib/db/schema'

export const ScheduleSelectSchema = createSelectSchema(itemSchedules)
export type Schedule = z.infer<typeof ScheduleSelectSchema>

export const ScheduleKindSchema = z.enum(['planned', 'actual'])
export type ScheduleKind = z.infer<typeof ScheduleKindSchema>

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'ISO 形式の日時を指定してください' })

export const CreateScheduleInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    itemId: z.string().uuid().nullish(),
    kind: ScheduleKindSchema,
    startAt: isoDateTime,
    endAt: isoDateTime,
    // iter1137: max(2000) に ja message 付与 (iter1086/1092/1126-1136 sweep)
    note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
  })
  .superRefine((v, ctx) => {
    if (Date.parse(v.endAt) <= Date.parse(v.startAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'end は start より後にしてください',
      })
    }
    const span = Date.parse(v.endAt) - Date.parse(v.startAt)
    if (span > MS_PER_DAY) {
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: '24 時間を超えるスロットは作れません',
      })
    }
    if (v.kind === 'planned' && !v.itemId) {
      ctx.addIssue({
        code: 'custom',
        path: ['itemId'],
        message: '想定スロットには task が必要です',
      })
    }
  })
export type CreateScheduleInput = z.infer<typeof CreateScheduleInputSchema>

export const MoveScheduleInputSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().nonnegative(),
    startAt: isoDateTime,
    endAt: isoDateTime,
  })
  .superRefine((v, ctx) => {
    if (Date.parse(v.endAt) <= Date.parse(v.startAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'end は start より後にしてください',
      })
    }
  })
export type MoveScheduleInput = z.infer<typeof MoveScheduleInputSchema>

export const UpdateScheduleInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      itemId: z.string().uuid().nullish(),
      startAt: isoDateTime.optional(),
      endAt: isoDateTime.optional(),
      // iter1137: max(2000) に ja message 付与 (iter1086/1092/1126-1136 sweep)
      note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleInputSchema>

export const SoftDeleteScheduleInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteScheduleInput = z.infer<typeof SoftDeleteScheduleInputSchema>

export const StartTimerInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid().nullable(),
  startAt: isoDateTime.optional(),
  // iter1137: max(2000) に ja message 付与 (他 schedule schema と統一)
  note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
})
export type StartTimerInput = z.infer<typeof StartTimerInputSchema>

export const StopTimerInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  endAt: isoDateTime.optional(),
})
export type StopTimerInput = z.infer<typeof StopTimerInputSchema>

export const ListSchedulesByDateInputSchema = z.object({
  workspaceId: z.string().uuid(),
  // iter1160 refactor: ISO_DATE_RE regex に ja message 統一
  /** ISO date "YYYY-MM-DD"。範囲は workspace TZ ベースでサーバ側が解釈 */
  date: z.string().regex(ISO_DATE_RE, 'YYYY-MM-DD 形式で入力してください'),
})
export type ListSchedulesByDateInput = z.infer<typeof ListSchedulesByDateInputSchema>
