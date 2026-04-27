/**
 * Phase 6.15 iter120: 外部 API 取込元の CRUD service。
 * 取込 worker (実際に fetch して item を作る部分) は次 iter で実装。
 */
import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { externalSourceRepository } from './repository'
import { CreateSourceInputSchema, type ExternalSource, UpdateSourceInputSchema } from './schema'

export const externalSourceService = {
  async create(input: unknown): Promise<Result<ExternalSource>> {
    const parsed = CreateSourceInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    await requireWorkspaceMember(data.workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const created = await externalSourceRepository.insert(tx, {
        workspaceId: data.workspaceId,
        name: data.name,
        kind: data.kind,
        config: data.config,
        scheduleCron: data.scheduleCron,
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId: data.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'external_source',
        targetId: created.id,
        action: 'create',
        after: created,
      })
      return ok(created)
    })
  },

  async update(input: unknown): Promise<Result<ExternalSource>> {
    const parsed = UpdateSourceInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認', parsed.error))
    const data = parsed.data

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await externalSourceRepository.findById(tx, data.id)
      if (!before) return err(new NotFoundError('External source が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')

      const updated = await externalSourceRepository.updateWithLock(
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
        targetType: 'external_source',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async list(workspaceId: string): Promise<Result<ExternalSource[]>> {
    if (!workspaceId) return err(new ValidationError('workspaceId 必須'))
    const user = await requireUser()
    await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      const rows = await externalSourceRepository.listByWorkspace(tx, workspaceId)
      return ok(rows)
    })
  },

  async softDelete(id: string): Promise<Result<{ id: string }>> {
    if (!id) return err(new ValidationError('id 必須'))
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await externalSourceRepository.findById(tx, id)
      if (!before) return err(new NotFoundError('External source が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      const ok_ = await externalSourceRepository.softDelete(tx, id)
      if (!ok_) return err(new NotFoundError('External source が見つかりません'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'external_source',
        targetId: id,
        action: 'delete',
        before,
      })
      return ok({ id })
    })
  },
}
