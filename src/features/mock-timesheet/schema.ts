import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { ISO_DATE_RE } from '@/lib/date/iso'
import { mockTimesheetEntries } from '@/lib/db/schema'

import { TimeEntryCategorySchema } from '@/features/time-entry/categories'

export const MockTimesheetEntrySchema = createSelectSchema(mockTimesheetEntries)
export type MockTimesheetEntry = z.infer<typeof MockTimesheetEntrySchema>

// iter1086: zod default error は英語 ("Invalid email address" / "Too small: expected string to
// have >=1 characters" 等) で日本語 UI 利用者の認知負荷高。auth schema (signupInput / loginInput)
// と convention を揃え、ユーザに直接見える validation message を全て日本語化。
export const MockTimesheetLoginInputSchema = z.object({
  email: z.string().trim().email('正しいメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})
export type MockTimesheetLoginInput = z.infer<typeof MockTimesheetLoginInputSchema>

export const MockTimesheetSubmitInputSchema = z.object({
  workDate: z.string().regex(ISO_DATE_RE, '勤務日は YYYY-MM-DD 形式で入力してください'),
  category: TimeEntryCategorySchema,
  description: z.string().max(2000, '作業内容は 2000 文字以内で入力してください'),
  // 15 分 (0.25h) 刻みのため 0.25 倍数チェック
  hoursDecimal: z
    .number({ message: '時間を入力してください' })
    .min(0.25, '時間は最低 0.25 (15 分) 必要です')
    .max(24, '時間は最大 24 (24 時間) までです')
    .multipleOf(0.25, '時間は 0.25 (15 分) 単位で入力してください'),
})
export type MockTimesheetSubmitInput = z.infer<typeof MockTimesheetSubmitInputSchema>
