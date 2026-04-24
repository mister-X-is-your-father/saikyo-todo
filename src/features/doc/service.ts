import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, ValidationError } from '@/lib/errors'
import { enqueueJob } from '@/lib/jobs/queue'
import { err, ok, type Result } from '@/lib/result'
import { mutateWithGuard } from '@/lib/service-mutate'

import { docRepository } from './repository'
import {
  CreateDocInputSchema,
  type Doc,
  SoftDeleteDocInputSchema,
  UpdateDocInputSchema,
} from './schema'

/** title/body 変更を含む patch かを判定 (embedding 対象が変わるかだけ気にする) */
function needsReembed(patch: Record<string, unknown>): boolean {
  return 'title' in patch || 'body' in patch
}

const NOT_FOUND = 'Doc が見つかりません'

export const docService = {
  async create(input: unknown): Promise<Result<Doc>> {
    const parsed = CreateDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, ...rest } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')

    const result = await withUserDb(user.id, async (tx) => {
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
    // Commit 後に embedding ジョブを enqueue (失敗しても Doc 作成は成立)
    if (result.ok) {
      await enqueueJob('doc-embed', { docId: result.value.id })
    }
    return result
  },

  async update(input: unknown): Promise<Result<Doc>> {
    const parsed = UpdateDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const result = await mutateWithGuard<Doc>({
      findById: (tx, id) => docRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
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
      },
    })
    // title/body 変更時のみ re-embed (sourceTemplateId だけの更新は不要)
    if (result.ok && needsReembed(parsed.data.patch as Record<string, unknown>)) {
      await enqueueJob('doc-embed', { docId: result.value.id })
    }
    return result
  },

  async softDelete(input: unknown): Promise<Result<Doc>> {
    const parsed = SoftDeleteDocInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    return await mutateWithGuard<Doc>({
      findById: (tx, id) => docRepository.findById(tx, id),
      id: parsed.data.id,
      notFoundMessage: NOT_FOUND,
      fn: async (tx, before, user) => {
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
      },
    })
  },

  async list(workspaceId: string) {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await docRepository.list(tx, { workspaceId })
    })
  },
}
