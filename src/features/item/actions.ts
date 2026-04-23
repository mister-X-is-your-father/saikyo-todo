'use server'

import { revalidatePath } from 'next/cache'

import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { Item } from './schema'
import { itemService } from './service'

async function wrap<T>(fn: () => Promise<Result<T>>, revalidate?: string): Promise<Result<T>> {
  try {
    const result = await fn()
    if (result.ok && revalidate) revalidatePath(revalidate, 'layout')
    return result
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function createItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.create(input))
}

export async function updateItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.update(input))
}

export async function updateItemStatusAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.updateStatus(input))
}

export async function softDeleteItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.softDelete(input))
}

export async function moveItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.move(input))
}

export async function reorderItemAction(input: unknown): Promise<Result<Item>> {
  return await wrap(() => itemService.reorder(input))
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
