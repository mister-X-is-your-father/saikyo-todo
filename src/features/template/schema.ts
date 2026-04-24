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
export const CreateTemplateInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1, '名前を入力してください').max(200),
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
      name: z.string().min(1).max(200).optional(),
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
    title: z.string().min(1, 'タイトルを入力してください').max(500),
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
      title: z.string().min(1).max(500).optional(),
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

/** Template を実 Item ツリーに展開する (instantiate)。 */
export const InstantiateTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
  variables: z.record(z.string(), z.unknown()).default({}),
  /** recurring (pg_cron) からの呼び出しで多重展開防止。UNIQUE 制約違反で 2回目は ConflictError。 */
  cronRunId: z.string().min(1).nullish(),
  /** root item のタイトルを template.name 以外にしたい時 */
  rootTitleOverride: z.string().nullish(),
})
export type InstantiateTemplateInput = z.infer<typeof InstantiateTemplateInputSchema>

export interface InstantiateResult {
  instantiationId: string
  rootItemId: string
  createdItemCount: number // root + children
}
