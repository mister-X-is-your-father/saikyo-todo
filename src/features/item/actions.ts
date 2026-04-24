'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

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

export async function softDeleteItemAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemService.softDelete(input))
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
