import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { docs } from '@/lib/db/schema'

export const DocSelectSchema = createSelectSchema(docs)
export type Doc = z.infer<typeof DocSelectSchema>

export const CreateDocInputSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1, 'タイトルを入力してください').max(500),
  body: z.string().default(''),
  sourceTemplateId: z.string().uuid().nullish(),
  idempotencyKey: z.string().uuid(),
})
export type CreateDocInput = z.infer<typeof CreateDocInputSchema>

export const UpdateDocInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      title: z.string().min(1).max(500).optional(),
      body: z.string().optional(),
      sourceTemplateId: z.string().uuid().nullish(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新する項目がありません',
    }),
})
export type UpdateDocInput = z.infer<typeof UpdateDocInputSchema>

export const SoftDeleteDocInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteDocInput = z.infer<typeof SoftDeleteDocInputSchema>
