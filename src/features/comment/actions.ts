'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { CommentOnDoc, CommentOnItem } from './schema'
import { commentService } from './service'

export async function createCommentOnItemAction(input: unknown): Promise<Result<CommentOnItem>> {
  return await actionWrap(() => commentService.onItem.create(input))
}

export async function listCommentsOnItemAction(itemId: string): Promise<Result<CommentOnItem[]>> {
  try {
    const comments = await commentService.onItem.list(itemId)
    return ok(comments)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function listCommentsOnDocAction(docId: string): Promise<Result<CommentOnDoc[]>> {
  try {
    const comments = await commentService.onDoc.list(docId)
    return ok(comments)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
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
