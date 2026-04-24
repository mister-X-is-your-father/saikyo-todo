'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { WorkspaceStatusRow } from './repository'
import { type CreateWorkspaceInput } from './schema'
import { workspaceService } from './service'

export async function createWorkspaceAction(
  input: CreateWorkspaceInput,
): Promise<Result<{ id: string }>> {
  return await actionWrap(() => workspaceService.create(input), '/')
}

export async function listWorkspaceStatusesAction(
  workspaceId: string,
): Promise<Result<WorkspaceStatusRow[]>> {
  try {
    return ok(await workspaceService.listStatuses(workspaceId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
