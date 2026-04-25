'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { Tag } from './schema'
import { tagService } from './service'

export async function createTagAction(input: unknown): Promise<Result<Tag>> {
  return await actionWrap(() => tagService.create(input))
}

export async function updateTagAction(input: unknown): Promise<Result<Tag>> {
  return await actionWrap(() => tagService.update(input))
}

export async function deleteTagAction(input: unknown): Promise<Result<Tag>> {
  return await actionWrap(() => tagService.delete(input))
}

export async function listTagsAction(workspaceId: string): Promise<Result<Tag[]>> {
  try {
    const tags = await tagService.listByWorkspace(workspaceId)
    return ok(tags)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
