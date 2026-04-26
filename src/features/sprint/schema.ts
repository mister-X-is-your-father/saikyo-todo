import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { sprints } from '@/lib/db/schema'

export const SprintSelectSchema = createSelectSchema(sprints)
export type Sprint = z.infer<typeof SprintSelectSchema>

export const SprintStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled'])
export type SprintStatus = z.infer<typeof SprintStatusSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で')

export const CreateSprintInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1, '名前を入力').max(120),
    goal: z.string().max(500).nullable().optional(),
    startDate: isoDate,
    endDate: isoDate,
    idempotencyKey: z.string().uuid(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: 'start_date は end_date 以前',
    path: ['endDate'],
  })
export type CreateSprintInput = z.infer<typeof CreateSprintInputSchema>

export const UpdateSprintInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z.string().min(1).max(120).optional(),
      goal: z.string().max(500).nullable().optional(),
      startDate: isoDate.optional(),
      endDate: isoDate.optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新項目がありません',
    })
    .refine((p) => !(p.startDate && p.endDate) || p.startDate <= p.endDate, {
      message: 'start_date は end_date 以前',
      path: ['endDate'],
    }),
})
export type UpdateSprintInput = z.infer<typeof UpdateSprintInputSchema>

export const ChangeSprintStatusInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: SprintStatusSchema,
})
export type ChangeSprintStatusInput = z.infer<typeof ChangeSprintStatusInputSchema>

export const AssignItemToSprintInputSchema = z.object({
  itemId: z.string().uuid(),
  sprintId: z.string().uuid().nullable(),
})
export type AssignItemToSprintInput = z.infer<typeof AssignItemToSprintInputSchema>

/**
 * Phase 6.15 iter 110: Sprint workspace デフォルト編集入力。
 * - startDow: 0=日, 1=月, …, 6=土
 * - lengthDays: 1..90 (DB CHECK 制約と整合)
 */
export const UpdateSprintDefaultsInputSchema = z.object({
  workspaceId: z.string().uuid(),
  startDow: z.number().int().min(0).max(6),
  lengthDays: z.number().int().min(1).max(90),
})
export type UpdateSprintDefaultsInput = z.infer<typeof UpdateSprintDefaultsInputSchema>
