'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { Item } from '@/features/item/schema'

import type { ItemIoArtifact, ItemStakeholder } from './schema'
import { itemMetadataService } from './service'

export async function setItemGoalAction(input: unknown): Promise<Result<Item>> {
  return await actionWrap(() => itemMetadataService.setGoal(input))
}

export async function addItemArtifactAction(input: unknown): Promise<Result<ItemIoArtifact>> {
  return await actionWrap(() => itemMetadataService.addArtifact(input))
}

export async function removeItemArtifactAction(input: unknown): Promise<Result<ItemIoArtifact>> {
  return await actionWrap(() => itemMetadataService.removeArtifact(input))
}

export async function listItemArtifactsAction(itemId: string): Promise<Result<ItemIoArtifact[]>> {
  try {
    return ok(await itemMetadataService.listArtifacts(itemId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function addItemStakeholderAction(input: unknown): Promise<Result<ItemStakeholder>> {
  return await actionWrap(() => itemMetadataService.addStakeholder(input))
}

export async function removeItemStakeholderAction(
  input: unknown,
): Promise<Result<{ removed: boolean }>> {
  return await actionWrap(() => itemMetadataService.removeStakeholder(input))
}

export async function listItemStakeholdersAction(
  itemId: string,
): Promise<Result<ItemStakeholder[]>> {
  try {
    return ok(await itemMetadataService.listStakeholders(itemId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
