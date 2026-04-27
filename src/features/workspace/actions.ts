'use server'

import { actionWrap } from '@/lib/action-wrap'
import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import type { WorkspaceMemberRow, WorkspaceStatusRow } from './repository'
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

export async function listWorkspaceMembersAction(
  workspaceId: string,
): Promise<Result<WorkspaceMemberRow[]>> {
  try {
    return ok(await workspaceService.listMembers(workspaceId))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

/**
 * Phase 6.15 iter131: チームコンテキスト (workspace_settings.team_context) 取得 / 更新。
 * AI 経由 (Researcher / Goal 分解) のプロンプトに inject される workspace 共通方針。
 */
export async function getTeamContextAction(
  workspaceId: string,
): Promise<Result<{ teamContext: string }>> {
  return await actionWrap(() => workspaceService.getTeamContext(workspaceId))
}

export async function updateTeamContextAction(input: {
  workspaceId: string
  teamContext: string
}): Promise<Result<{ teamContext: string }>> {
  return await actionWrap(() => workspaceService.updateTeamContext(input))
}
