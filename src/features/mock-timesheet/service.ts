import 'server-only'

import { desc } from 'drizzle-orm'

import { mockTimesheetEntries } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import {
  type MockTimesheetEntry,
  MockTimesheetLoginInputSchema,
  MockTimesheetSubmitInputSchema,
} from './schema'

/**
 * Mock 用の固定クレデンシャル。env で上書き可。
 */
const MOCK_EMAIL = process.env.MOCK_TIMESHEET_EMAIL ?? 'ops@example.com'
const MOCK_PASSWORD = process.env.MOCK_TIMESHEET_PASSWORD ?? 'password1234'

export function getMockCredentials(): { email: string; password: string } {
  return { email: MOCK_EMAIL, password: MOCK_PASSWORD }
}

export const mockTimesheetService = {
  /**
   * 「ログイン」。実装は固定認証の一致チェックのみ。成功時はセッション ID (= email) を返す。
   */
  async login(input: unknown): Promise<Result<{ sessionId: string }>> {
    const parsed = MockTimesheetLoginInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力を確認してください', parsed.error))
    const { email, password } = parsed.data
    if (email !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
      return err(new ValidationError('メールまたはパスワードが違います'))
    }
    return ok({ sessionId: email })
  },

  /**
   * タイムシート 1 行を保存する。Playwright が /mock-timesheet/new から叩く。
   */
  async submit(
    sessionId: string,
    input: unknown,
  ): Promise<Result<{ entryId: string; externalRef: string }>> {
    if (!sessionId) return err(new ValidationError('未ログインです'))
    const parsed = MockTimesheetSubmitInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力を確認してください', parsed.error))
    const v = parsed.data

    const [row] = await adminDb
      .insert(mockTimesheetEntries)
      .values({
        sessionId,
        workDate: v.workDate,
        category: v.category,
        description: v.description,
        hoursDecimal: v.hoursDecimal.toFixed(2),
      })
      .returning()
    if (!row) throw new Error('insert failed')
    return ok({ entryId: row.id, externalRef: row.id })
  },

  async list(sessionId: string, limit = 50): Promise<Result<MockTimesheetEntry[]>> {
    if (!sessionId) return err(new ValidationError('未ログインです'))
    const rows = await adminDb
      .select()
      .from(mockTimesheetEntries)
      .orderBy(desc(mockTimesheetEntries.submittedAt))
      .limit(limit)
    return ok(rows as MockTimesheetEntry[])
  },
}
