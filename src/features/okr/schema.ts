import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { goals, keyResults } from '@/lib/db/schema'

export const GoalSelectSchema = createSelectSchema(goals)
export type Goal = z.infer<typeof GoalSelectSchema>

export const KeyResultSelectSchema = createSelectSchema(keyResults)
export type KeyResult = z.infer<typeof KeyResultSelectSchema>

export const GoalStatusSchema = z.enum(['active', 'completed', 'archived'])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

export const ProgressModeSchema = z.enum(['items', 'manual'])
export type ProgressMode = z.infer<typeof ProgressModeSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で')

export const CreateGoalInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    period: z.enum(['quarterly', 'annual', 'custom']).default('quarterly'),
    startDate: isoDate,
    endDate: isoDate,
    idempotencyKey: z.string().uuid(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: 'start_date は end_date 以前',
    path: ['endDate'],
  })
export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>

export const UpdateGoalInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional(),
      startDate: isoDate.optional(),
      endDate: isoDate.optional(),
      status: GoalStatusSchema.optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新項目がありません' }),
})
export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>

export const CreateKeyResultInputSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(1).max(300),
  progressMode: ProgressModeSchema.default('items'),
  targetValue: z.number().nullable().optional(),
  currentValue: z.number().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  weight: z.number().int().min(1).max(10).default(1),
  position: z.number().int().min(0).default(0),
  idempotencyKey: z.string().uuid(),
})
export type CreateKeyResultInput = z.infer<typeof CreateKeyResultInputSchema>

export const UpdateKeyResultInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z.string().min(1).max(300).optional(),
      progressMode: ProgressModeSchema.optional(),
      targetValue: z.number().nullable().optional(),
      currentValue: z.number().nullable().optional(),
      unit: z.string().max(20).nullable().optional(),
      weight: z.number().int().min(1).max(10).optional(),
      position: z.number().int().min(0).optional(),
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
