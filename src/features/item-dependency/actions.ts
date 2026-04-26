'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { ItemDependencyGroup, ItemDependencyRow } from './schema'
import { itemDependencyService } from './service'

export async function addItemDependencyAction(input: unknown): Promise<Result<ItemDependencyRow>> {
  return await actionWrap(() => itemDependencyService.add(input))
}

export async function removeItemDependencyAction(
  input: unknown,
): Promise<Result<{ removed: boolean }>> {
  return await actionWrap(() => itemDependencyService.remove(input))
}

export async function listItemDependenciesAction(
  itemId: string,
): Promise<Result<ItemDependencyGroup>> {
  try {
    return await itemDependencyService.listForItem(itemId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function listWorkspaceBlocksDependenciesAction(
  workspaceId: string,
): Promise<Result<Array<{ fromItemId: string; toItemId: string }>>> {
  try {
    return await itemDependencyService.listBlocksForWorkspace(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
