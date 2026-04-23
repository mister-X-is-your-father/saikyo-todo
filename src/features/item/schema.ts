import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { items } from '@/lib/db/schema'

export const ItemSelectSchema = createSelectSchema(items)
export type Item = z.infer<typeof ItemSelectSchema>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const CreateItemInputSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z.string().min(1, 'タイトルを入力してください').max(500),
    description: z.string().default(''),
    status: z.string().min(1).default('todo'),
    parentItemId: z.string().uuid().nullish(),
    startDate: z.string().regex(ISO_DATE).nullish(),
    dueDate: z.string().regex(ISO_DATE).nullish(),
    isMust: z.boolean().default(false),
    dod: z.string().nullish(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((v, ctx) => {
    if (v.isMust && (!v.dod || v.dod.trim().length === 0)) {
      ctx.addIssue({ code: 'custom', path: ['dod'], message: 'MUST には DoD が必要です' })
    }
    if (v.startDate && v.dueDate && v.startDate > v.dueDate) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: '期限は開始日以降にしてください' })
    }
  })
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>

export const UpdateItemInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      status: z.string().min(1).optional(),
      startDate: z.string().regex(ISO_DATE).nullish(),
      dueDate: z.string().regex(ISO_DATE).nullish(),
      isMust: z.boolean().optional(),
      dod: z.string().nullish(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新する項目がありません',
    }),
})
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>

export const UpdateStatusInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  status: z.string().min(1),
  position: z.string().optional(), // fractional indexing 文字列
})
export type UpdateStatusInput = z.infer<typeof UpdateStatusInputSchema>

export const SoftDeleteItemInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteItemInput = z.infer<typeof SoftDeleteItemInputSchema>

export const MoveItemInputSchema = z.object({
  id: z.string().uuid(),
  // null で root に移動
  newParentItemId: z.string().uuid().nullable(),
})
export type MoveItemInput = z.infer<typeof MoveItemInputSchema>
