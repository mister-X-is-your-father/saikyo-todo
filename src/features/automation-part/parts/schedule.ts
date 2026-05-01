/**
 * queue: AP-2 substrate — schedule.* part 群 (sample 移植)。
 *
 * 既存 scheduleService を thin wrap する形で part 化。AP-2 第 1 弾:
 *   - schedule.create (planned / actual を input.kind で出し分け)
 *   - schedule.start_timer (実測タイマー開始 = actual + placeholder end)
 *
 * stop_timer / move / update 等は AP-2 第 2 弾以降で。
 *
 * 設計メモ:
 *   - scheduleService は requireWorkspaceMember(workspaceId, 'member') を内部で呼ぶ
 *   - workspaceId は ctx 経由 (input に直接含めない)、kind / startAt / endAt / itemId
 *     は input 経由
 *   - planned schedule は itemId 必須 (schema superRefine)
 *   - 24 時間超は reject (schema superRefine)
 */
import 'server-only'

import { z } from 'zod'

import { ScheduleSelectSchema } from '@/features/schedule/schema'
import { scheduleService } from '@/features/schedule/service'

import { definePart } from '../types'

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'ISO 形式の日時を指定してください' })

const ScheduleCreateInput = z.object({
  itemId: z.string().uuid().nullish(),
  kind: z.enum(['planned', 'actual']),
  startAt: isoDateTime,
  endAt: isoDateTime,
  note: z.string().max(2000).nullish(),
})

export const scheduleCreatePart = definePart({
  id: 'schedule.create',
  label: 'schedule を作成',
  description:
    'planned / actual schedule を 1 件作成する。workspace は ctx 経由で固定、24 時間超 / planned で itemId 不在は service 側で reject。',
  category: 'schedule',
  sideEffect: 'write',
  input: ScheduleCreateInput,
  output: ScheduleSelectSchema,
  run: async (input, ctx) => {
    const r = await scheduleService.create({
      workspaceId: ctx.workspaceId,
      itemId: input.itemId ?? null,
      kind: input.kind,
      startAt: input.startAt,
      endAt: input.endAt,
      note: input.note ?? null,
    })
    if (!r.ok) throw new Error(`schedule.create failed: ${r.error.message ?? r.error.code}`)
    return r.value
  },
})

const ScheduleStartTimerInput = z.object({
  /** 計測対象の item。null = workspace 直 (item 紐付けなし、自由計測) */
  itemId: z.string().uuid().nullable(),
  /** 開始時刻 (省略時 = サーバ now) */
  startAt: isoDateTime.optional(),
  note: z.string().max(2000).nullish(),
})

export const scheduleStartTimerPart = definePart({
  id: 'schedule.start_timer',
  label: '実測タイマーを開始',
  description:
    '実測 (kind=actual) schedule を作成して計測開始。endAt は startAt + 60s の placeholder、stop_timer で確定。',
  category: 'schedule',
  sideEffect: 'write',
  input: ScheduleStartTimerInput,
  output: ScheduleSelectSchema,
  run: async (input, ctx) => {
    const r = await scheduleService.startTimer({
      workspaceId: ctx.workspaceId,
      itemId: input.itemId,
      startAt: input.startAt,
      note: input.note ?? null,
    })
    if (!r.ok) throw new Error(`schedule.start_timer failed: ${r.error.message ?? r.error.code}`)
    return r.value
  },
})
