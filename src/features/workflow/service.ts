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
import { CreateWorkflowInputSchema, UpdateWorkflowInputSchema, type Workflow } from './schema'

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
}
