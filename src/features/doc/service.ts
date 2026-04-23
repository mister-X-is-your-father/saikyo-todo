import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { docRepository } from './repository'
import {
  CreateDocInputSchema,
  type Doc,
  SoftDeleteDocInputSchema,
  UpdateDocInputSchema,
} from './schema'

export const docService = {
  async create(input: unknown): Promise<Result<Doc>> {
    const parsed = CreateDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, ...rest } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    return await withUserDb(user.id, async (tx) => {
      const doc = await docRepository.insert(tx, {
        workspaceId,
        title: rest.title,
        body: rest.body,
        sourceTemplateId: rest.sourceTemplateId ?? null,
        createdByActorType: 'user',
        createdByActorId: user.id,
      })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'doc',
        targetId: doc.id,
        action: 'create',
        after: doc,
      })
      return ok(doc)
    })
  },

  async update(input: unknown): Promise<Result<Doc>> {
    const parsed = UpdateDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await this._mutateWithGuard(parsed.data.id, async (tx, before, user) => {
      const updated = await docRepository.updateWithLock(
        tx,
        parsed.data.id,
        parsed.data.expectedVersion,
        parsed.data.patch as Partial<Parameters<typeof docRepository.insert>[1]>,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'doc',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async softDelete(input: unknown): Promise<Result<Doc>> {
    const parsed = SoftDeleteDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await this._mutateWithGuard(parsed.data.id, async (tx, before, user) => {
      const updated = await docRepository.softDelete(
        tx,
        parsed.data.id,
        parsed.data.expectedVersion,
      )
      if (!updated) return err(new ConflictError())
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'doc',
        targetId: updated.id,
        action: 'delete',
        before,
      })
      return ok(updated)
    })
  },

  async list(workspaceId: string) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await docRepository.list(tx, { workspaceId })
    })
  },

  /**
   * Item と同パターン: RLS 経由で before を取得 → workspace_id で member ガード → fn 実行。
   */
  async _mutateWithGuard(
    docId: string,
    fn: (
      tx: Parameters<Parameters<typeof withUserDb>[1]>[0],
      before: Doc,
      user: { id: string },
    ) => Promise<Result<Doc>>,
  ): Promise<Result<Doc>> {
    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await docRepository.findById(tx, docId)
      if (!before) return err(new NotFoundError('Doc が見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      return await fn(tx, before, user)
    })
  },
}
