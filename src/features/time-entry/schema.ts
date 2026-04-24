import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { timeEntries } from '@/lib/db/schema'

import { TimeEntryCategorySchema } from './categories'

export const TimeEntrySelectSchema = createSelectSchema(timeEntries)
export type TimeEntry = z.infer<typeof TimeEntrySelectSchema>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const CreateTimeEntryInputSchema = z.object({
  workspaceId: z.string().uuid(),
  itemId: z.string().uuid().nullish(),
  workDate: z.string().regex(ISO_DATE, 'YYYY-MM-DD 形式で入力してください'),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000).default(''),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  idempotencyKey: z.string().uuid(),
})
export type CreateTimeEntryInput = z.infer<typeof CreateTimeEntryInputSchema>

export const ListTimeEntriesInputSchema = z.object({
  workspaceId: z.string().uuid(),
  /** ISO 日付 YYYY-MM-DD。指定時はこの日付 >= with_date */
  from: z.string().regex(ISO_DATE).optional(),
  to: z.string().regex(ISO_DATE).optional(),
  limit: z.number().int().min(1).max(500).default(100),
})
export type ListTimeEntriesInput = z.infer<typeof ListTimeEntriesInputSchema>
