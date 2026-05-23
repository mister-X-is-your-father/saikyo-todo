import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { templateItems, templates } from '@/lib/db/schema'

export const TemplateSelectSchema = createSelectSchema(templates)
export type Template = z.infer<typeof TemplateSelectSchema>

export const TemplateItemSelectSchema = createSelectSchema(templateItems)
export type TemplateItem = z.infer<typeof TemplateItemSelectSchema>

const TemplateKind = z.enum(['manual', 'recurring'])

/**
 * cron syntax の厳密チェックはしない (pg_cron に任せる)。
 * recurring kind の時だけ scheduleCron が必須。
 */
// iter1130: name.max(200) / item title.max(500) / description.max(2000) には ja message が無く
// zod default 英語が露出。iter1086/1092/1126-1129 ja convention で全 max 制約に ja message 付与。
export const CreateTemplateInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: z
      .string()
      .min(1, 'Template 名を入力してください')
      .max(200, 'Template 名は 200 文字以内で入力してください'),
    description: z.string().default(''),
    kind: TemplateKind.default('manual'),
    scheduleCron: z.string().nullish(),
    variablesSchema: z.record(z.string(), z.unknown()).default({}),
    tags: z.array(z.string()).default([]),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'recurring' && (!v.scheduleCron || v.scheduleCron.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduleCron'],
        message: 'recurring の Template には cron 式が必要です',
      })
    }
  })
export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>

export const UpdateTemplateInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      name: z
        .string()
        .min(1, 'Template 名を入力してください')
        .max(200, 'Template 名は 200 文字以内で入力してください')
        .optional(),
      description: z.string().optional(),
      kind: TemplateKind.optional(),
      scheduleCron: z.string().nullish(),
      variablesSchema: z.record(z.string(), z.unknown()).optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>

export const SoftDeleteTemplateInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteTemplateInput = z.infer<typeof SoftDeleteTemplateInputSchema>

/** TemplateItem = Template 配下の child item (展開元)。 */
export const AddTemplateItemInputSchema = z
  .object({
    templateId: z.string().uuid(),
    title: z
      .string()
      .min(1, 'タイトルを入力してください')
      .max(500, 'タイトルは 500 文字以内で入力してください'),
    description: z.string().default(''),
    parentPath: z.string().default(''), // 空 = root
    statusInitial: z.string().default('todo'),
    dueOffsetDays: z.number().int().nullish(),
    isMust: z.boolean().default(false),
    dod: z.string().nullish(),
    defaultAssignees: z.array(z.record(z.string(), z.unknown())).default([]),
    agentRoleToInvoke: z.string().nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.isMust && (!v.dod || v.dod.trim() === '')) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
  })
export type AddTemplateItemInput = z.infer<typeof AddTemplateItemInputSchema>

export const UpdateTemplateItemInputSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      title: z
        .string()
        .min(1, 'タイトルを入力してください')
        .max(500, 'タイトルは 500 文字以内で入力してください')
        .optional(),
      description: z.string().optional(),
      parentPath: z.string().optional(),
      statusInitial: z.string().optional(),
      dueOffsetDays: z.number().int().nullish(),
      isMust: z.boolean().optional(),
      dod: z.string().nullish(),
      defaultAssignees: z.array(z.record(z.string(), z.unknown())).optional(),
      agentRoleToInvoke: z.string().nullish(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: '更新する項目がありません' }),
})
export type UpdateTemplateItemInput = z.infer<typeof UpdateTemplateItemInputSchema>

export const RemoveTemplateItemInputSchema = z.object({ id: z.string().uuid() })
export type RemoveTemplateItemInput = z.infer<typeof RemoveTemplateItemInputSchema>

/**
 * 既存 Item ツリー (parent + 子孫) を Template として保存する入力。
 *
 * scope A: position / dueOffsetDays / agent_role_to_invoke / tags / assignees は
 * 保持しない。subtask の subtask 等の深い階層は ltree で正しく保持される
 * (= フラット 2 階層に限定しない、意外と汎用)。
 *
 * - itemId: 元になる parent Item の id (子孫 = parent_path が parent のフル path
 *   で始まる items)
 * - name: template.name (省略時は parent.title)
 * - description: template.description (省略時は parent.description)
 */
export const CreateTemplateFromItemInputSchema = z.object({
  itemId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Template 名を入力してください')
    .max(200, 'Template 名は 200 文字以内で入力してください')
    .optional(),
  description: z.string().max(2000, '説明は 2000 文字以内で入力してください').optional(),
})
export type CreateTemplateFromItemInput = z.infer<typeof CreateTemplateFromItemInputSchema>

/** Template を実 Item ツリーに展開する (instantiate)。 */
export const InstantiateTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
  variables: z.record(z.string(), z.unknown()).default({}),
  /** recurring (pg_cron) からの呼び出しで多重展開防止。UNIQUE 制約違反で 2回目は ConflictError。 */
  // iter1154: cronRunId.min(1) に ja message 無く zod default 英語が露出
  cronRunId: z.string().min(1, 'cronRunId は空でない必要があります').nullish(),
  /** root item のタイトルを template.name 以外にしたい時 */
  rootTitleOverride: z.string().nullish(),
})
export type InstantiateTemplateInput = z.infer<typeof InstantiateTemplateInputSchema>

export interface InstantiateResult {
  instantiationId: string
  rootItemId: string
  createdItemCount: number // root + children
}
