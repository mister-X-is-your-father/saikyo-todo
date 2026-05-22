import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { commentsOnDocs, commentsOnItems } from '@/lib/db/schema'

export const CommentOnItemSelectSchema = createSelectSchema(commentsOnItems)
export type CommentOnItem = z.infer<typeof CommentOnItemSelectSchema>

export const CommentOnDocSelectSchema = createSelectSchema(commentsOnDocs)
export type CommentOnDoc = z.infer<typeof CommentOnDocSelectSchema>

// iter1132: body.max(10_000) には ja message が無く zod default 英語が露出 (min(1) は ja
// message あり)。iter1086/1092/1126-1131 ja convention で全 max に ja message 付与。
export const CreateCommentOnItemInputSchema = z.object({
  itemId: z.string().uuid(),
  body: z
    .string()
    .min(1, '本文を入力してください')
    .max(10_000, '本文は 10,000 文字以内で入力してください'),
  idempotencyKey: z.string().uuid(),
})
export type CreateCommentOnItemInput = z.infer<typeof CreateCommentOnItemInputSchema>

export const CreateCommentOnDocInputSchema = z.object({
  docId: z.string().uuid(),
  body: z
    .string()
    .min(1, '本文を入力してください')
    .max(10_000, '本文は 10,000 文字以内で入力してください'),
  idempotencyKey: z.string().uuid(),
})
export type CreateCommentOnDocInput = z.infer<typeof CreateCommentOnDocInputSchema>

export const UpdateCommentInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      body: z
        .string()
        .min(1, '本文を入力してください')
        .max(10_000, '本文は 10,000 文字以内で入力してください')
        .optional(),
    })
    .refine((p) => Object.keys(p).length > 0, {
      message: '更新する項目がありません',
    }),
})
export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>

export const SoftDeleteCommentInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
})
export type SoftDeleteCommentInput = z.infer<typeof SoftDeleteCommentInputSchema>
