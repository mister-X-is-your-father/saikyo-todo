/**
 * queue: AP-2 substrate — schedule.* part 群 (sample 移植)。
 *
 * 既存 scheduleService を thin wrap する形で part 化:
 *   - schedule.create (planned / actual を input.kind で出し分け)
 *   - schedule.start_timer (実測タイマー開始 = actual + placeholder end)
 *   - schedule.stop_timer (実測タイマー停止、楽観ロック必須、iter592)
 *   - schedule.update (部分 patch + 楽観ロック、iter604)
 *
 * move は AP-2 残以降で。
 *
 * 設計メモ:
 *   - scheduleService は requireWorkspaceMember(workspaceId, 'member') を内部で呼ぶ
 *   - workspaceId は ctx 経由 (input に直接含めない)、kind / startAt / endAt / itemId
 *     は input 経由
 *   - planned schedule は itemId 必須 (schema superRefine)
 *   - 24 時間超は reject (schema superRefine)
 *   - stop_timer は kind=actual のみ許容、kind=planned に対しては service が ValidationError
 */
import 'server-only'

import { z } from 'zod'

import { ScheduleSelectSchema } from '@/features/schedule/schema'
import { scheduleService } from '@/features/schedule/service'

import { definePart, unwrapPartResult } from '../types'

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'ISO 形式の日時を指定してください' })

const ScheduleCreateInput = z.object({
  itemId: z.string().uuid().nullish(),
  kind: z.enum(['planned', 'actual']),
  startAt: isoDateTime,
  endAt: isoDateTime,
  note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
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
    return unwrapPartResult('schedule.create', r)
  },
})

const ScheduleStartTimerInput = z.object({
  /** 計測対象の item。null = workspace 直 (item 紐付けなし、自由計測) */
  itemId: z.string().uuid().nullable(),
  /** 開始時刻 (省略時 = サーバ now) */
  startAt: isoDateTime.optional(),
  note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
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
    return unwrapPartResult('schedule.start_timer', r)
  },
})

/**
 * iter592 ai-automation: schedule.stop_timer part — 実測スロットの end を確定。
 *
 * start_timer で作った placeholder end (startAt + 60s) を確定値に書き換える。
 * 楽観ロック必須、kind=planned には service が ValidationError を返す。
 */
const ScheduleStopTimerInput = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  /** 終了時刻 (省略時 = サーバ now)。startAt 以前は service が reject */
  endAt: isoDateTime.optional(),
})

export const scheduleStopTimerPart = definePart({
  id: 'schedule.stop_timer',
  label: '実測タイマーを停止',
  description:
    '実測 (kind=actual) schedule の endAt を確定する (楽観ロック必須)。kind=planned は reject。',
  category: 'schedule',
  sideEffect: 'write',
  input: ScheduleStopTimerInput,
  output: ScheduleSelectSchema,
  run: async (input) => {
    const r = await scheduleService.stopTimer({
      id: input.id,
      expectedVersion: input.expectedVersion,
      endAt: input.endAt,
    })
    return unwrapPartResult('schedule.stop_timer', r)
  },
})

/**
 * iter604 ai-automation: schedule.update part — 部分 patch + 楽観ロック。
 *
 * itemId / startAt / endAt / note を patch で個別更新可能。startAt / endAt の片方だけ
 * 変えても service が「最終的な start < end」 を check (= 不正な順序を構造的に reject)。
 * AC-1「AI に任せた」 で AI が「予定スロットを 30 分後ろ倒し」 等を atomic に呼べる。
 */
const ScheduleUpdatePatchInput = z
  .object({
    itemId: z.string().uuid().nullish(),
    startAt: isoDateTime.optional(),
    endAt: isoDateTime.optional(),
    note: z.string().max(2000, 'メモは 2,000 文字以内で入力してください').nullish(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' })

const ScheduleUpdateInput = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: ScheduleUpdatePatchInput,
})

export const scheduleUpdatePart = definePart({
  id: 'schedule.update',
  label: 'schedule を更新',
  description:
    '指定 schedule の itemId / startAt / endAt / note を patch で更新する (楽観ロック必須)。startAt < endAt は service 内で check。',
  category: 'schedule',
  sideEffect: 'write',
  input: ScheduleUpdateInput,
  output: ScheduleSelectSchema,
  run: async (input) => {
    const r = await scheduleService.update({
      id: input.id,
      expectedVersion: input.expectedVersion,
      patch: input.patch,
    })
    return unwrapPartResult('schedule.update', r)
  },
})
