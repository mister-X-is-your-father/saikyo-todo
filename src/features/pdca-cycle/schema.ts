/**
 * queue: PDCA P-1 substrate — pdca_cycles + pdca_cycle_items の zod schema 一次定義。
 * 詳細は FEEDBACK_QUEUE.md "PDCA mode 抜本再設計" 参照。
 */
import { z } from 'zod'

import type { pdcaCycleItems, pdcaCycles } from '@/lib/db/schema'

export type PdcaCycle = typeof pdcaCycles.$inferSelect
export type PdcaCycleItem = typeof pdcaCycleItems.$inferSelect

export const PdcaCycleStatusSchema = z.enum(['plan', 'do', 'check', 'act', 'closed'])
export type PdcaCycleStatus = z.infer<typeof PdcaCycleStatusSchema>

export const PdcaCycleItemRoleSchema = z.enum(['do', 'reference'])
export type PdcaCycleItemRole = z.infer<typeof PdcaCycleItemRoleSchema>

// iter1126: zod default error は英語 (Too small / Too big / Invalid uuid 等) で日本語 UI
// 利用者の認知負荷高。iter1086 mock-timesheet / iter1092 workspace schema と同 convention で
// ユーザに直接見える validation message を全て日本語化。
export const CreatePdcaCycleInputSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z
    .string()
    .min(1, 'タイトルを入力してください')
    .max(200, 'タイトルは 200 文字以内で入力してください'),
  hypothesis: z.string().max(4000, '仮説は 4000 文字以内で入力してください').default(''),
  targetMetric: z.string().max(200, '指標は 200 文字以内で入力してください').default(''),
  targetValue: z.string().max(200, '目標値は 200 文字以内で入力してください').default(''),
})
export type CreatePdcaCycleInput = z.infer<typeof CreatePdcaCycleInputSchema>

export const UpdatePdcaCycleInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z.string().min(1).max(200).optional(),
      hypothesis: z.string().max(4000).optional(),
      targetMetric: z.string().max(200).optional(),
      targetValue: z.string().max(200).optional(),
      actualValue: z.string().max(200).optional(),
      checkFindings: z.string().max(8000).optional(),
      actDecisions: z.string().max(8000).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch は空でない必要があります' }),
})
export type UpdatePdcaCycleInput = z.infer<typeof UpdatePdcaCycleInputSchema>

/**
 * phase 進行: plan → do → check → act → closed の順方向のみ許可 (back transition は禁止)。
 * service 層で現状 status との整合性を check する。
 */
export const AdvancePdcaCyclePhaseInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  to: PdcaCycleStatusSchema,
})
export type AdvancePdcaCyclePhaseInput = z.infer<typeof AdvancePdcaCyclePhaseInputSchema>

export const LinkItemToCycleInputSchema = z.object({
  cycleId: z.string().uuid(),
  itemId: z.string().uuid(),
  role: PdcaCycleItemRoleSchema.default('do'),
  sortKey: z.number().int().default(0),
})
export type LinkItemToCycleInput = z.infer<typeof LinkItemToCycleInputSchema>

export const UnlinkItemFromCycleInputSchema = z.object({
  cycleId: z.string().uuid(),
  itemId: z.string().uuid(),
})
export type UnlinkItemFromCycleInput = z.infer<typeof UnlinkItemFromCycleInputSchema>

export const ListPdcaCyclesInputSchema = z.object({
  workspaceId: z.string().uuid(),
  status: PdcaCycleStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(200).default(50),
})
export type ListPdcaCyclesInput = z.infer<typeof ListPdcaCyclesInputSchema>
