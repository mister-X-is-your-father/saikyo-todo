/**
 * queue: AP-2 substrate — time_entry.* part 群 (sample 移植)。
 *
 * 既存 timeEntryService を thin wrap する形で part 化。AP-2 第 4 弾:
 *   - time_entry.create (稼働記録 1 件作成、idempotencyKey 必須)
 *
 * list / update は AP-2 第 5 弾以降で。
 *
 * 設計メモ:
 *   - timeEntryService.create は内部で requireWorkspaceMember(workspaceId, 'member')
 *     を呼ぶ
 *   - workspaceId は ctx 経由 (input に直接含めない) — schedule / item と同じ pattern
 *   - durationMinutes は 1 〜 1440 (24h、schema で enforce)
 *   - category は固定 enum (dev / meeting / research / ops / other) — categories.ts
 *     で workspace 横断統一
 *   - idempotencyKey で workflow 再実行 / agent retry の duplicate insert 防止
 */
import 'server-only'

import { z } from 'zod'

import { ISO_DATE_RE } from '@/lib/date/iso'

import { TimeEntryCategorySchema } from '@/features/time-entry/categories'
import { TimeEntrySelectSchema } from '@/features/time-entry/schema'
import { timeEntryService } from '@/features/time-entry/service'

import { definePart, unwrapPartResult } from '../types'

const TimeEntryCreateInput = z.object({
  itemId: z.string().uuid().nullish(),
  workDate: z.string().regex(ISO_DATE_RE),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000).optional(),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  idempotencyKey: z.string().uuid(),
})

export const timeEntryCreatePart = definePart({
  id: 'time_entry.create',
  label: '稼働記録を作成',
  description:
    '指定 workDate / category / durationMinutes で稼働記録を 1 件追加する。idempotencyKey で重複防御。',
  category: 'time',
  sideEffect: 'write',
  input: TimeEntryCreateInput,
  output: TimeEntrySelectSchema,
  run: async (input, ctx) => {
    const r = await timeEntryService.create({
      workspaceId: ctx.workspaceId,
      itemId: input.itemId ?? null,
      workDate: input.workDate,
      category: input.category,
      description: input.description ?? '',
      durationMinutes: input.durationMinutes,
      idempotencyKey: input.idempotencyKey,
    })
    return unwrapPartResult('time_entry.create', r)
  },
})
