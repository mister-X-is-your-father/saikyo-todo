import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { timeEntries } from '@/lib/db/schema'

import { TimeEntryCategorySchema } from './categories'

export const TimeEntrySelectSchema = createSelectSchema(timeEntries)
export type TimeEntry = z.infer<typeof TimeEntrySelectSchema>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// iter1139: description.max(2000) / durationMinutes.min(1).max(1440) / limit.min(1).max(500)
// には ja message 無く zod default 英語が露出。iter1086/1092/1126-1138 ja convention で全 ja 化。
export const CreateTimeEntryInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid().nullish(),
  workDate: z.string().regex(ISO_DATE, 'YYYY-MM-DD 形式で入力してください'),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000, '作業内容は 2,000 文字以内で入力してください').default(''),
  durationMinutes: z
    .number()
    .int()
    .min(1, '時間は 1 分以上で入力してください')
    .max(24 * 60, '時間は 24 時間 (1440 分) 以内で入力してください'),
  idempotencyKey: z.string().uuid(),
})
export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntryInputSchema>

export const ListTimeEntriesInputSchema = z.object({
  workspaceId: z.string().uuid(),
  // iter1160 refactor: ISO_DATE regex に ja message 統一 (item/schema.ts と同 message)
  /** ISO 日付 YYYY-MM-DD。指定時はこの日付 >= with_date */
  from: z.string().regex(ISO_DATE, 'YYYY-MM-DD 形式で入力してください').optional(),
  to: z.string().regex(ISO_DATE, 'YYYY-MM-DD 形式で入力してください').optional(),
  limit: z
    .number()
    .int()
    .min(1, '取得件数は 1 以上で指定してください')
    .max(500, '取得件数は 500 以下で指定してください')
    .default(100),
})
export type ListTimeEntriesInput = z.infer<typeof ListTimeEntriesInputSchema>
