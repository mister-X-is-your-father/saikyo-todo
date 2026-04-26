'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { Sprint } from './schema'
import { sprintService } from './service'

export async function createSprintAction(input: unknown): Promise<Result<Sprint>> {
  return await actionWrap(() => sprintService.create(input))
}

export async function getSprintDefaultsAction(
  workspaceId: string,
): Promise<Result<{ startDow: number; lengthDays: number }>> {
  return await actionWrap(() => sprintService.getDefaults(workspaceId))
}

export async function updateSprintDefaultsAction(
  input: unknown,
): Promise<Result<{ startDow: number; lengthDays: number }>> {
  return await actionWrap(() => sprintService.updateDefaults(input))
}

export async function updateSprintAction(input: unknown): Promise<Result<Sprint>> {
  return await actionWrap(() => sprintService.update(input))
}

export async function changeSprintStatusAction(input: unknown): Promise<Result<Sprint>> {
  return await actionWrap(() => sprintService.changeStatus(input))
}

export async function listSprintsAction(workspaceId: string): Promise<Result<Sprint[]>> {
  try {
    return await sprintService.list(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function getActiveSprintAction(workspaceId: string): Promise<Result<Sprint | null>> {
  try {
    return await sprintService.getActive(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function assignItemToSprintAction(
  input: unknown,
): Promise<Result<{ itemId: string; sprintId: string | null }>> {
  return await actionWrap(() => sprintService.assignItem(input))
}

export async function sprintProgressAction(
  sprintId: string,
): Promise<Result<{ total: number; done: number }>> {
  try {
    return await sprintService.progress(sprintId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
