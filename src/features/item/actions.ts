'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { AssigneeRef } from './repository'
import type { Item } from './schema'
import { itemService } from './service'

export async function createItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.create(input))
}

export async function updateItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.update(input))
}

export async function updateItemStatusAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.updateStatus(input))
}

export async function toggleCompleteItemAction(input: {
  id: string
  expectedVersion: number
  complete: boolean
}): Promise<Result<Item>> {
  return await actionWrap(() => itemService.toggleComplete(input))
}

export async function softDeleteItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.softDelete(input))
}

export async function archiveItemAction(input: {
  id: string
  expectedVersion: number
}): Promise<Result<Item>> {
  return await actionWrap(() => itemService.archive(input))
}

export async function unarchiveItemAction(input: {
  id: string
  expectedVersion: number
}): Promise<Result<Item>> {
  return await actionWrap(() => itemService.unarchive(input))
}

export async function setItemBaselineAction(input: {
  id: string
  expectedVersion: number
}): Promise<Result<Item>> {
  return await actionWrap(() => itemService.setBaseline(input))
}

export async function clearItemBaselineAction(input: {
  id: string
  expectedVersion: number
}): Promise<Result<Item>> {
  return await actionWrap(() => itemService.clearBaseline(input))
}

export async function moveItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.move(input))
}

export async function reorderItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.reorder(input))
}

export async function listItemsAction(
  workspaceId: string,
  filter?: { status?: string; isMust?: boolean },
): Promise<Result<Item[]>> {
  try {
    const items = await itemService.list(workspaceId, filter ?? {})
    return ok(items)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function setItemAssigneesAction(input: {
  itemId: string
  assignees: AssigneeRef[]
}): Promise<Result<AssigneeRef[]>> {
  return await actionWrap(() => itemService.setAssignees(input.itemId, input.assignees))
}

export async function setItemTagsAction(input: {
  itemId: string
  tagIds: string[]
}): Promise<Result<string[]>> {
  return await actionWrap(() => itemService.setTags(input.itemId, input.tagIds))
}

export async function listItemAssigneesAction(itemId: string): Promise<Result<AssigneeRef[]>> {
  try {
    return ok(await itemService.listAssignees(itemId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function listItemTagIdsAction(itemId: string): Promise<Result<string[]>> {
  try {
    return ok(await itemService.listTagIds(itemId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function bulkUpdateItemStatusAction(input: {
  workspaceId: string
  ids: string[]
  status: string
}): Promise<Result<{ succeeded: string[]; failed: { id: string; reason: string }[] }>> {
  return await actionWrap(() =>
    itemService.bulkUpdateStatus(input.workspaceId, input.ids, input.status),
  )
}

export async function bulkSoftDeleteItemAction(input: {
  workspaceId: string
  ids: string[]
}): Promise<Result<{ succeeded: string[]; failed: { id: string; reason: string }[] }>> {
  return await actionWrap(() => itemService.bulkSoftDelete(input.workspaceId, input.ids))
}
