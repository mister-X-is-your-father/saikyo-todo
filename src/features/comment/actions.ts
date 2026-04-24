'use server'

import { actionWrap } from '@/lib/action-wrap'
import type { Result } from '@/lib/result'

import type { CommentOnDoc, CommentOnItem } from './schema'
import { commentService } from './service'

export async function createCommentOnItemAction(input: unknown): Promise<Result<CommentOnItem>> {
  return await actionWrap(() => commentService.onItem.create(input))
}

export async function updateCommentOnItemAction(input: unknown): Promise<Result<CommentOnItem>> {
  return await actionWrap(() => commentService.onItem.update(input))
}

export async function softDeleteCommentOnItemAction(
  input: unknown,
): Promise<Result<CommentOnItem>> {
  return await actionWrap(() => commentService.onItem.softDelete(input))
}

export async function createCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await actionWrap(() => commentService.onDoc.create(input))
}

export async function updateCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await actionWrap(() => commentService.onDoc.update(input))
}

export async function softDeleteCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await actionWrap(() => commentService.onDoc.softDelete(input))
}
