import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { sprints } from '@/lib/db/schema'

export const SprintSelectSchema = createSelectSchema(sprints)
export type Sprint = z.infer<typeof SprintSelectSchema>

export const SprintStatusSchema = z.enum(['planning', 'active', 'completed', 'cancelled'])
export type SprintStatus = z.infer<typeof SprintStatusSchema>

/**
 * iter521 basics: SprintStatus → 短い JA chip label。
 * sprints-panel / Slack 通知 / aria-label / AI prompt で再利用可能な共通 label 源。
 *
 * UI 文言は既存の sprints-panel.tsx STATUS_LABEL と同一 (sprints-panel から本 helper を
 * 消費する形に refactor する次 iter で重複が消える)。
 */
const SPRINT_STATUS_LABEL_JA: Record<SprintStatus, string> = {
  planning: '計画中',
  active: '稼働中',
  completed: '完了',
  cancelled: '中止',
}

export function sprintStatusLabelJa(status: SprintStatus): string {
  return SPRINT_STATUS_LABEL_JA[status]
}

/**
 * iter524 basics: SprintStatus → 5 段階 共通 Severity bridge。
 * SeverityChip の tone bind / Slack 通知の chip 配色を統一する用途。
 *
 *   'planning'  → 'info'   (= 計画中、青、ニュートラル)
 *   'active'    → 'ok'     (= 稼働中、緑、healthy in-progress)
 *   'completed' → 'muted'  (= 完了、グレー、過去 chip)
 *   'cancelled' → 'danger' (= 中止、赤、注意喚起)
 *
 * 設計意図:
 *   - active が ok (緑) = 「いま走ってる」を最重要 visual に (= 軸 1 可視化)
 *   - completed は muted (= 過去の事項、強調しない)、active と差別化
 *   - cancelled は danger (= 例外、目立たせる)
 */
const SPRINT_STATUS_SEVERITY: Record<SprintStatus, 'ok' | 'info' | 'warn' | 'danger' | 'muted'> = {
  planning: 'info',
  active: 'ok',
  completed: 'muted',
  cancelled: 'danger',
}

export function sprintStatusSeverity(
  status: SprintStatus,
): 'ok' | 'info' | 'warn' | 'danger' | 'muted' {
  return SPRINT_STATUS_SEVERITY[status]
}

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
