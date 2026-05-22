import { z } from 'zod'

import { personalPeriodGoals } from '@/lib/db/schema'

export type PersonalPeriodGoal = typeof personalPeriodGoals.$inferSelect

export const PeriodSchema = z.enum(['day', 'week', 'month'])
export type Period = z.infer<typeof PeriodSchema>

/**
 * iter523 basics: Period → 短い JA chip label。
 * personal-period-view / Slack 通知 / aria-label / AI prompt で再利用可能な共通 label 源。
 *
 * 文言は既存の personal-period-view.tsx PERIOD_LABEL と同一 (wire-up で重複削除)。
 */
const PERIOD_LABEL_JA: Record<Period, string> = {
  day: '日次',
  week: '週次',
  month: '月次',
}

export function periodLabelJa(period: Period): string {
  return PERIOD_LABEL_JA[period]
}

export const UpsertGoalInputSchema = z.object({
  workspaceId: z.string().uuid(),
  period: PeriodSchema,
  /**
   * day: "2026-04-27"
   * week: "2026-W18" (ISO 週)
   * month: "2026-04"
   */
  periodKey: z
    .string()
    .min(1, '期間 key を入力してください')
    .max(20, '期間 key は 20 文字以内で入力してください'),
  // iter1140: max(2000) に ja message 付与 (iter1086/1092/1126-1139 sweep)
  text: z.string().max(2000, 'ゴールは 2,000 文字以内で入力してください'),
  /** 楽観ロック: 既存 row が無ければ 0、ある場合は呼び出し側が読み取って渡す */
  expectedVersion: z.number().int().nonnegative(),
})
export type UpsertGoalInput = z.infer<typeof UpsertGoalInputSchema>

export const GetGoalInputSchema = z.object({
  workspaceId: z.string().uuid(),
  period: PeriodSchema,
  periodKey: z
    .string()
    .min(1, '期間 key を入力してください')
    .max(20, '期間 key は 20 文字以内で入力してください'),
})
export type GetGoalInput = z.infer<typeof GetGoalInputSchema>
