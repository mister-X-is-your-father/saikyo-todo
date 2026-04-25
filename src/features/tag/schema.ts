import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { tags } from '@/lib/db/schema'

export const TagSelectSchema = createSelectSchema(tags)
export type Tag = z.infer<typeof TagSelectSchema>

const COLOR = /^#[0-9a-fA-F]{6}$/

export const CreateTagInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'タグ名を入力してください').max(60),
  color: z.string().regex(COLOR, '色は #RRGGBB 形式で指定してください').default('#64748b'),
})
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>

export const UpdateTagInputSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      name: z.string().min(1).max(60).optional(),
      color: z.string().regex(COLOR).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新する項目がありません',
    }),
})
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>

export const DeleteTagInputSchema = z.object({
  id: z.string().uuid(),
})
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>
