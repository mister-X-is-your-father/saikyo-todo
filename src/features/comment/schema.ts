import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { commentsOnDocs, commentsOnItems } from '@/lib/db/schema'

export const CommentOnItemSelectSchema = createSelectSchema(commentsOnItems)
export type CommentOnItem = z.infer<typeof CommentOnItemSelectSchema>

export const CommentOnDocSelectSchema = createSelectSchema(commentsOnDocs)
export type CommentOnDoc = z.infer<typeof CommentOnDocSelectSchema>

export const CreateCommentOnItemInputSchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().min(1, '本文を入力してください').max(10_000),
  idempotencyKey: z.string().uuid(),
})
export type CreateCommentOnItemInput = z.infer<typeof CreateCommentOnItemInputSchema>

export const CreateCommentOnDocInputSchema = z.object({
  docId: z.string().uuid(),
  body: z.string().min(1, '本文を入力してください').max(10_000),
  idempotencyKey: z.string().uuid(),
})
export type CreateCommentOnDocInput = z.infer<typeof CreateCommentOnDocInputSchema>

export const UpdateCommentInputSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().nonnegative(),
  patch: z
    .object({
      body: z.string().min(1).max(10_000).optional(),
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
