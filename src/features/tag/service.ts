import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { tagRepository } from './repository'
import {
  CreateTagInputSchema,
  DeleteTagInputSchema,
  type Tag,
  UpdateTagInputSchema,
} from './schema'

export const tagService = {
  async create(input: unknown): Promise<Result<Tag>> {
    const parsed = CreateTagInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))
    const { workspaceId, name, color } = parsed.data

    const { user } = await requireWorkspaceMember(workspaceId, 'member')
    return await withUserDb(user.id, async (tx) => {
      const existing = await tagRepository.findByName(tx, workspaceId, name)
      if (existing) return err(new ConflictError('同名のタグが既に存在します'))
      const tag = await tagRepository.insert(tx, { workspaceId, name, color })
      await recordAudit(tx, {
        workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'tag',
        targetId: tag.id,
        action: 'create',
        after: tag,
      })
      return ok(tag)
    })
  },

  async update(input: unknown): Promise<Result<Tag>> {
    const parsed = UpdateTagInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await tagRepository.findById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError('タグが見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      if (parsed.data.patch.name && parsed.data.patch.name !== before.name) {
        const dup = await tagRepository.findByName(tx, before.workspaceId, parsed.data.patch.name)
        if (dup) return err(new ConflictError('同名のタグが既に存在します'))
      }
      const updated = await tagRepository.update(tx, parsed.data.id, parsed.data.patch)
      if (!updated) return err(new NotFoundError('タグが見つかりません'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'tag',
        targetId: updated.id,
        action: 'update',
        before,
        after: updated,
      })
      return ok(updated)
    })
  },

  async delete(input: unknown): Promise<Result<Tag>> {
    const parsed = DeleteTagInputSchema.safeParse(input)
    if (!parsed.success) return err(new ValidationError('入力内容を確認してください', parsed.error))

    const user = await requireUser()
    return await withUserDb(user.id, async (tx) => {
      const before = await tagRepository.findById(tx, parsed.data.id)
      if (!before) return err(new NotFoundError('タグが見つかりません'))
      await requireWorkspaceMember(before.workspaceId, 'member')
      const deleted = await tagRepository.delete(tx, parsed.data.id)
      if (!deleted) return err(new NotFoundError('タグが見つかりません'))
      await recordAudit(tx, {
        workspaceId: before.workspaceId,
        actorType: 'user',
        actorId: user.id,
        targetType: 'tag',
        targetId: before.id,
        action: 'delete',
        before,
      })
      return ok(before)
    })
  },

  async listByWorkspace(workspaceId: string): Promise<Tag[]> {
    const { user } = await requireWorkspaceMember(workspaceId, 'viewer')
    return await withUserDb(user.id, async (tx) => {
      return await tagRepository.listByWorkspace(tx, workspaceId)
    })
  },
}
