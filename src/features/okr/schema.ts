import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { goals, keyResults } from '@/lib/db/schema'

export const GoalSelectSchema = createSelectSchema(goals)
export type Goal = z.infer<typeof GoalSelectSchema>

export const KeyResultSelectSchema = createSelectSchema(keyResults)
export type KeyResult = z.infer<typeof KeyResultSelectSchema>

export const GoalStatusSchema = z.enum(['active', 'completed', 'archived'])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

/**
 * iter522 basics: GoalStatus → 短い JA chip label。
 * goals-panel / Slack 通知 / aria-label / AI prompt で再利用可能な共通 label 源。
 *
 * 文言は既存の goals-panel.tsx STATUS_LABEL と同一 (wire-up で重複削除)。
 */
const GOAL_STATUS_LABEL_JA: Record<GoalStatus, string> = {
  active: '稼働中',
  completed: '完了',
  archived: 'アーカイブ',
}

export function goalStatusLabelJa(status: GoalStatus): string {
  return GOAL_STATUS_LABEL_JA[status]
}

/**
 * iter525 ai-automation: GoalStatus → 5 段階 共通 Severity bridge。
 * iter524 sprintStatusSeverity と同 pattern (sprint と同 4→3 値の差分はあるが思想同じ)。
 *
 *   'active'    → 'ok'    (= 稼働中、緑、healthy in-progress)
 *   'completed' → 'muted' (= 完了、グレー、過去 chip)
 *   'archived'  → 'muted' (= アーカイブ、グレー、より目立たない)
 *
 * 設計意図: Goal は cancelled 概念がない (archive で代替) ため danger は不在。
 * active のみ強調 (= 「いま追ってる目標」を最重要 visual、軸 1 可視化)。
 */
const GOAL_STATUS_SEVERITY: Record<GoalStatus, 'ok' | 'info' | 'warn' | 'danger' | 'muted'> = {
  active: 'ok',
  completed: 'muted',
  archived: 'muted',
}

export function goalStatusSeverity(
  status: GoalStatus,
): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  return GOAL_STATUS_SEVERITY[status]
}

export const ProgressModeSchema = z.enum(['items', 'manual'])
export type ProgressMode = z.infer<typeof ProgressModeSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で')

// iter1128: title.max / description.max / KR title.max / unit.max には ja message が無く zod
// default 英語が露出。refine "start_date は end_date 以前" は技術用語混在。iter1086/1092/1126/1127
// convention で全 message 日本語化。
// iter1146: KR weight.min(1).max(10) / position.min(0) (int 制約) の ja message 追加。
export const CreateGoalInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z
      .string()
      .min(1, 'Goal タイトルを入力してください')
      .max(200, 'Goal タイトルは 200 文字以内で入力してください'),
    description: z
      .string()
      .max(2000, 'Goal 説明は 2000 文字以内で入力してください')
      .nullable()
      .optional(),
    period: z.enum(['quarterly', 'annual', 'custom']).default('quarterly'),
    startDate: isoDate,
    endDate: isoDate,
    idempotencyKey: z.string().uuid(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: '開始日は終了日以前にしてください',
    path: ['endDate'],
  })
export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>

export const UpdateGoalInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z
        .string()
        .min(1, 'Goal タイトルを入力してください')
        .max(200, 'Goal タイトルは 200 文字以内で入力してください')
        .optional(),
      description: z
        .string()
        .max(2000, 'Goal 説明は 2000 文字以内で入力してください')
        .nullable()
        .optional(),
      startDate: isoDate.optional(),
      endDate: isoDate.optional(),
      status: GoalStatusSchema.optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新項目がありません' }),
})
export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>

export const CreateKeyResultInputSchema = z.object({
  goalId: z.string().uuid(),
  title: z
    .string()
    .min(1, 'Key Result タイトルを入力してください')
    .max(300, 'Key Result タイトルは 300 文字以内で入力してください'),
  progressMode: ProgressModeSchema.default('items'),
  targetValue: z.number().nullable().optional(),
  currentValue: z.number().nullable().optional(),
  unit: z.string().max(20, '単位は 20 文字以内で入力してください').nullable().optional(),
  weight: z
    .number()
    .int()
    .min(1, 'weight は 1 以上で指定してください')
    .max(10, 'weight は 10 以下で指定してください')
    .default(1),
  position: z.number().int().min(0, 'position は 0 以上で指定してください').default(0),
  idempotencyKey: z.string().uuid(),
})
export type CreateKeyResultInput = z.infer<typeof CreateKeyResultInputSchema>

export const UpdateKeyResultInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z
        .string()
        .min(1, 'Key Result タイトルを入力してください')
        .max(300, 'Key Result タイトルは 300 文字以内で入力してください')
        .optional(),
      progressMode: ProgressModeSchema.optional(),
      targetValue: z.number().nullable().optional(),
      currentValue: z.number().nullable().optional(),
      unit: z.string().max(20, '単位は 20 文字以内で入力してください').nullable().optional(),
      weight: z
        .number()
        .int()
        .min(1, 'weight は 1 以上で指定してください')
        .max(10, 'weight は 10 以下で指定してください')
        .optional(),
      position: z.number().int().min(0, 'position は 0 以上で指定してください').optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新項目がありません' }),
})
export type UpdateKeyResultInput = z.infer<typeof UpdateKeyResultInputSchema>

export const AssignItemToKeyResultInputSchema = z.object({
  itemId: z.string().uuid(),
  keyResultId: z.string().uuid().nullable(),
})
export type AssignItemToKeyResultInput = z.infer<typeof AssignItemToKeyResultInputSchema>

/** Goal の進捗集計形 (Service が返す) */
export interface GoalProgress {
  goalId: string
  /** 0..1 (0 = 未着手, 1 = 達成) */
  pct: number
  keyResults: Array<{
    krId: string
    title: string
    pct: number
    /** mode='items' の時の集計 */
    itemsTotal: number
    itemsDone: number
    /** mode='manual' の時の集計 */
    current: number | null
    target: number | null
    unit: string | null
    weight: number
  }>
}
