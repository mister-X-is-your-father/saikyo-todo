'use server'

import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { CommentOnDoc, CommentOnItem } from './schema'
import { commentService } from './service'

async function wrap<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn()
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function createCommentOnItemAction(input: unknown): Promise<Result<CommentOnItem>> {
  return await wrap(() => commentService.onItem.create(input))
}

export async function updateCommentOnItemAction(input: unknown): Promise<Result<CommentOnItem>> {
  return await wrap(() => commentService.onItem.update(input))
}

export async function softDeleteCommentOnItemAction(
  input: unknown,
): Promise<Result<CommentOnItem>> {
  return await wrap(() => commentService.onItem.softDelete(input))
}

export async function createCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await wrap(() => commentService.onDoc.create(input))
}

export async function updateCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await wrap(() => commentService.onDoc.update(input))
}

export async function softDeleteCommentOnDocAction(input: unknown): Promise<Result<CommentOnDoc>> {
  return await wrap(() => commentService.onDoc.softDelete(input))
}
