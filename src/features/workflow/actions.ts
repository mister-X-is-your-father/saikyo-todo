'use server'

import { eq } from 'drizzle-orm'

import { actionWrap } from '@/lib/action-wrap'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { workflows } from '@/lib/db/schema'
import { adminDb } from '@/lib/db/scoped-client'
import { ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { runWorkflow } from './engine'
import type { Workflow } from './schema'
import { workflowService } from './service'

export async function createWorkflowAction(input: unknown): Promise<Result<Workflow>> {
  return await actionWrap(() => workflowService.create(input))
}

export async function updateWorkflowAction(input: unknown): Promise<Result<Workflow>> {
  return await actionWrap(() => workflowService.update(input))
}

export async function listWorkflowsAction(workspaceId: string): Promise<Result<Workflow[]>> {
  return await actionWrap(() => workflowService.list(workspaceId))
}

export async function deleteWorkflowAction(id: string): Promise<Result<{ id: string }>> {
  return await actionWrap(() => workflowService.softDelete(id))
}

/**
 * Phase 6.15 iter113: 手動 trigger。member 以上のみ。
 * worker / pg-boss を挟まずこの場で sync 実行する (各 node 10s timeout、合計でも実用的)。
 * 将来 cron / item-event でも runWorkflow を呼ぶ。
 */
export async function triggerWorkflowAction(
  input: unknown,
): Promise<
  Result<{ runId: string; status: 'succeeded' | 'failed'; output: unknown; error?: string }>
> {
  return await actionWrap(async () => {
    if (!input || typeof input !== 'object') return err(new ValidationError('input が不正'))
    const obj = input as { workflowId?: string; input?: unknown }
    if (!obj.workflowId) return err(new ValidationError('workflowId 必須'))

    // workspace member 確認
    const wfRows = await adminDb
      .select({ workspaceId: workflows.workspaceId, deletedAt: workflows.deletedAt })
      .from(workflows)
      .where(eq(workflows.id, obj.workflowId))
      .limit(1)
    const wf = wfRows[0]
    if (!wf || wf.deletedAt) return err(new ValidationError('Workflow が見つかりません'))
    await requireWorkspaceMember(wf.workspaceId, 'member')

    const r = await runWorkflow({
      workflowId: obj.workflowId,
      triggerKind: 'manual',
      input: obj.input,
    })
    return ok(r)
  })
}
