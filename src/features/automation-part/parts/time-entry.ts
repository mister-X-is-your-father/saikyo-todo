/**
 * queue: AP-2 substrate — time_entry.* part 群 (sample 移植)。
 *
 * 既存 timeEntryService を thin wrap する形で part 化:
 *   - time_entry.create (稼働記録 1 件作成、idempotencyKey 必須、AP-2 第 4 弾)
 *   - time_entry.list (期間 filter で稼働記録一覧、read 系、iter629 ai-automation 追加)
 *
 * 設計メモ:
 *   - timeEntryService.create は内部で requireWorkspaceMember(workspaceId, 'member')
 *     を呼ぶ
 *   - timeEntryService.list は requireWorkspaceMember(viewer)、from / to は YYYY-MM-DD
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

// iter1158: description.max(2000) / durationMinutes.min/max に ja message 無く zod
// default 英語が露出。iter1086/1092/1126-1157 ja convention で日本語化。
const TimeEntryCreateInput = z.object({
  itemId: z.string().uuid().nullish(),
  workDate: z.string().regex(ISO_DATE_RE, 'YYYY-MM-DD 形式で入力してください'),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000, '説明は 2,000 文字以内で入力してください').optional(),
  durationMinutes: z
    .number()
    .int()
    .min(1, '計測分数は 1 以上で指定してください')
    .max(24 * 60, '計測分数は 24 時間以内 (1440 分) で指定してください'),
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

/**
 * iter629 ai-automation: time_entry.list part — 期間 filter で稼働記録一覧 (read 系)。
 *
 * AC-1「AI に任せた」 の続編 (= AI が自動 stop_timer 後の累計工数を確認)、AC-5
 * 「AI 同僚 persona」 で AI が「先週の自分の稼働 categoryどれが多い?」 等を 1 part
 * で取得する経路。workspaceId は ctx 経由、from / to は ISO YYYY-MM-DD (caller が
 * workspace TZ で算出)、limit は 1-500 (default 100、service schema 既定)。
 */
const TimeEntryListInput = z.object({
  from: z.string().regex(ISO_DATE_RE).optional(),
  to: z.string().regex(ISO_DATE_RE).optional(),
  limit: z.number().int().min(1).max(500).optional(),
})

export const timeEntryListPart = definePart({
  id: 'time_entry.list',
  label: '稼働記録一覧を取得',
  description:
    '指定期間 (from / to ISO YYYY-MM-DD) の稼働記録一覧を返す。limit (default 100、最大 500) で件数制御。副作用なし、read scope。',
  category: 'time',
  sideEffect: 'read',
  input: TimeEntryListInput,
  output: z.array(TimeEntrySelectSchema),
  run: async (input, ctx) => {
    const r = await timeEntryService.list({
      workspaceId: ctx.workspaceId,
      ...(input.from ? { from: input.from } : {}),
      ...(input.to ? { to: input.to } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    })
    return unwrapPartResult('time_entry.list', r)
  },
})
