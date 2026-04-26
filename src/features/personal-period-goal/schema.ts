import { z } from 'zod'

import { personalPeriodGoals } from '@/lib/db/schema'

export type PersonalPeriodGoal = typeof personalPeriodGoals.$inferSelect

export const PeriodSchema = z.enum(['day', 'week', 'month'])
export type Period = z.infer<typeof PeriodSchema>

export const UpsertGoalInputSchema = z.object({
  workspaceId: z.string().uuid(),
  period: PeriodSchema,
  /**
   * day: "2026-04-27"
   * week: "2026-W18" (ISO 週)
   * month: "2026-04"
   */
  periodKey: z.string().min(1).max(20),
  text: z.string().max(2000),
  /** 楽観ロック: 既存 row が無ければ 0、ある場合は呼び出し側が読み取って渡す */
  expectedVersion: z.number().int().nonnegative(),
})
export type UpsertGoalInput = z.infer<typeof UpsertGoalInputSchema>

export const GetGoalInputSchema = z.object({
  workspaceId: z.string().uuid(),
  period: PeriodSchema,
  periodKey: z.string().min(1).max(20),
})
export type GetGoalInput = z.infer<typeof GetGoalInputSchema>
