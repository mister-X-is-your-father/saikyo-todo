'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'

import type { Goal, GoalProgress, KeyResult } from './schema'
import { okrService } from './service'

export async function createGoalAction(input: unknown): Promise<Result<Goal>> {
  return await actionWrap(() => okrService.createGoal(input))
}
export async function updateGoalAction(input: unknown): Promise<Result<Goal>> {
  return await actionWrap(() => okrService.updateGoal(input))
}
export async function listGoalsAction(workspaceId: string): Promise<Result<Goal[]>> {
  try {
    return await okrService.listGoals(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function createKeyResultAction(input: unknown): Promise<Result<KeyResult>> {
  return await actionWrap(() => okrService.createKeyResult(input))
}
export async function updateKeyResultAction(input: unknown): Promise<Result<KeyResult>> {
  return await actionWrap(() => okrService.updateKeyResult(input))
}
export async function deleteKeyResultAction(id: string): Promise<Result<{ id: string }>> {
  return await actionWrap(() => okrService.softDeleteKeyResult(id))
}
export async function listKeyResultsAction(goalId: string): Promise<Result<KeyResult[]>> {
  try {
    return await okrService.listKeyResults(goalId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
export async function listAllKeyResultsByWorkspaceAction(
  workspaceId: string,
): Promise<Result<Array<KeyResult & { goalTitle: string; goalStatus: string }>>> {
  try {
    return await okrService.listAllKeyResultsByWorkspace(workspaceId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
export async function assignItemToKeyResultAction(
  input: unknown,
): Promise<Result<{ itemId: string; keyResultId: string | null }>> {
  return await actionWrap(() => okrService.assignItemToKeyResult(input))
}
export async function goalProgressAction(goalId: string): Promise<Result<GoalProgress>> {
  try {
    return await okrService.goalProgress(goalId)
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
