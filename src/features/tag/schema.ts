import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { tags } from '@/lib/db/schema'

export const TagSelectSchema = createSelectSchema(tags)
export type Tag = z.infer<typeof TagSelectSchema>

const COLOR = /^#[0-9a-fA-F]{6}$/

// iter1133: name.max(60) / patch.color.regex には ja message が無く zod default 英語が露出。
// iter1086/1092/1126-1132 ja convention で全 max + regex ja 化。
export const CreateTagInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'タグ名を入力してください')
    .max(60, 'タグ名は 60 文字以内で入力してください'),
  color: z.string().regex(COLOR, '色は #RRGGBB 形式で指定してください').default('#64748b'),
})
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>

export const UpdateTagInputSchema = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      name: z
        .string()
        .min(1, 'タグ名を入力してください')
        .max(60, 'タグ名は 60 文字以内で入力してください')
        .optional(),
      color: z.string().regex(COLOR, '色は #RRGGBB 形式で指定してください').optional(),
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
