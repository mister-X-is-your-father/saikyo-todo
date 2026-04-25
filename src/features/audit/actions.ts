'use server'

import { isAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { type AuditEntryRow, auditService } from './service'

export async function listAuditByTargetItemAction(
  itemId: string,
  limit = 50,
): Promise<Result<AuditEntryRow[]>> {
  try {
    return ok(await auditService.listByTargetItem(itemId, limit))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}

export async function listAuditByWorkspaceAction(
  workspaceId: string,
  limit = 100,
): Promise<Result<AuditEntryRow[]>> {
  try {
    return ok(await auditService.listByWorkspace(workspaceId, limit))
  } catch (e) {
    if (isAppError(e)) return err(e)
    throw e
  }
}
