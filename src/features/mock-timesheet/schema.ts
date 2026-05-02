import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { ISO_DATE_RE } from '@/lib/date/iso'
import { mockTimesheetEntries } from '@/lib/db/schema'

import { TimeEntryCategorySchema } from '@/features/time-entry/categories'

export const MockTimesheetEntrySchema = createSelectSchema(mockTimesheetEntries)
export type MockTimesheetEntry = z.infer<typeof MockTimesheetEntrySchema>

export const MockTimesheetLoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type MockTimesheetLoginInput = z.infer<typeof MockTimesheetLoginInputSchema>

export const MockTimesheetSubmitInputSchema = z.object({
  workDate: z.string().regex(ISO_DATE_RE, 'YYYY-MM-DD'),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000),
  // 15 分 (0.25h) 刻みのため 0.25 倍数チェック
  hoursDecimal: z.number().min(0.25).max(24).multipleOf(0.25),
})
export type MockTimesheetSubmitInput = z.infer<typeof MockTimesheetSubmitInputSchema>
