/**
 * Phase 6.15 iter112: Workflow CRUD service。
 * 実行 engine (executor) と各 node 型は次 iter で実装する。
 * 現時点は定義の保存 / 一覧 / 編集 / 論理削除のみ。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { workflowRepository } from './repository'
import {
  CreateWorkflowInputSchema,
  UpdateWorkflowInputSchema,
  type Workflow,
  type WorkflowNodeRun,
  type WorkflowRun,
} from './schema'

export const workflowService = {
  async create(input: unknown): Promise<Result<Workflow>> {
    const parsed = CreateWorkflowInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const created = await workflowRepository.insert(tx, {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        graph: data.graph,
        trigger: data.trigger,
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'workflow',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async update(input: unknown): Promise<Result<Workflow>> {
    const parsed = UpdateWorkflowInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await workflowRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('Workflow が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')

      const updated = await workflowRepository.updateWithLock(
        tx,
        data.id,
        data.expectedVersion,
        data.patch,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'workflow',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async list(workspaceId: string): Promise<Result<Workflow[]>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await workflowRepository.listByWorkspace(tx, workspaceId)
      return ok(rows)
    })
  },

  async softDelete(id: string): Promise<Result<{ id: string }>> {
    if (!id) return err(new ValidationError('id 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await workflowRepository.findById(tx, id)
      if (!before) return err(new NotFoundError('Workflow が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      const ok_ = await workflowRepository.softDelete(tx, id)
      if (!ok_) return err(new NotFoundError('Workflow が見つかりません'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'workflow',
        targetId: id,
        action: 'delete',
        before,
      })
      return ok({ id })
    })
  },

  /** Phase 6.15 iter120: workflow の直近 run 履歴 (member 以上) */
  async listRecentRuns(workflowId: string, limit = 5): Promise<Result<WorkflowRun[]>> {
    if (!workflowId) return err(new ValidationError('workflowId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const wf = await workflowRepository.findById(tx, workflowId)
      if (!wf) return err(new NotFoundError('Workflow が見つかりません'))
      await requireWorkspaceMember(wf.workspaceId, 'viewer')
      const rows = await workflowRepository.listRecentRuns(tx, workflowId, limit)
      return ok(rows)
    })
  },

  /**
   * Phase 6.15 iter137: 1 run の node 単位ログ (各 node の input/output/error/duration)。
   * run → workflow → workspace の順に lookup して viewer 権限を確認する。
   */
  async listNodeRuns(runId: string): Promise<Result<WorkflowNodeRun[]>> {
    if (!runId) return err(new ValidationError('runId 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const run = await workflowRepository.findRunById(tx, runId)
      if (!run) return err(new NotFoundError('Run が見つかりません'))
      const wf = await workflowRepository.findById(tx, run.workflowId)
      if (!wf) return err(new NotFoundError('Workflow が見つかりません'))
      await requireWorkspaceMember(wf.workspaceId, 'viewer')
      const rows = await workflowRepository.listNodeRuns(tx, runId)
      return ok(rows)
    })
  },
}
