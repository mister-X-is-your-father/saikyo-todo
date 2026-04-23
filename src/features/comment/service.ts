import 'server-only'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { docRepository } from '@/features/doc/repository'
import { itemRepository } from '@/features/item/repository'

import { commentOnDocRepository, commentOnItemRepository } from './repository'
import {
  type CommentOnDoc,
  type CommentOnItem,
  CreateCommentOnDocInputSchema,
  CreateCommentOnItemInputSchema,
  SoftDeleteCommentInputSchema,
  UpdateCommentInputSchema,
} from './schema'

export const commentService = {
  onItem: {
    async create(input: unknown): Promise<Result<CommentOnItem>> {
      const parsed = CreateCommentOnItemInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      const user = await requireUser()
      return await withUserDb(user.id, async (tx) => {
        const item = await itemRepository.findById(tx, parsed.data.itemId)
        if (!item) return err(new NotFoundError('Item が見つかりません'))
        await requireWorkspaceMember(item.workspaceId, 'member')

        const comment = await commentOnItemRepository.insert(tx, {
          itemId: item.id,
          body: parsed.data.body,
          authorActorType: 'user',
          authorActorId: user.id,
        })
        await recordAudit(tx, {
          workspaceId: item.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_item',
          targetId: comment.id,
          action: 'create',
          after: comment,
        })
        return ok(comment)
      })
    },

    async update(input: unknown): Promise<Result<CommentOnItem>> {
      const parsed = UpdateCommentInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      return await _mutateOnItemWithGuard(parsed.data.id, async (tx, before, workspaceId, user) => {
        const updated = await commentOnItemRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          parsed.data.patch as Partial<Parameters<typeof commentOnItemRepository.insert>[1]>,
        )
        if (!updated) return err(new ConflictError())
        // 著者本人のみ編集可 (post-hoc チェック — RLS は workspace 単位までしか見ない)
        if (updated.authorActorId !== user.id || updated.authorActorType !== 'user') {
          return err(new ValidationError('自分のコメントのみ編集できます'))
        }
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_item',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      })
    },

    async softDelete(input: unknown): Promise<Result<CommentOnItem>> {
      const parsed = SoftDeleteCommentInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      return await _mutateOnItemWithGuard(parsed.data.id, async (tx, before, workspaceId, user) => {
        if (before.authorActorId !== user.id || before.authorActorType !== 'user') {
          return err(new ValidationError('自分のコメントのみ削除できます'))
        }
        const updated = await commentOnItemRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_item',
          targetId: updated.id,
          action: 'delete',
          before,
        })
        return ok(updated)
      })
    },

    async list(itemId: string) {
      const user = await requireUser()
      return await withUserDb(user.id, async (tx) => {
        const item = await itemRepository.findById(tx, itemId)
        if (!item) return []
        await requireWorkspaceMember(item.workspaceId, 'viewer')
        return await commentOnItemRepository.listByItem(tx, itemId)
      })
    },
  },

  onDoc: {
    async create(input: unknown): Promise<Result<CommentOnDoc>> {
      const parsed = CreateCommentOnDocInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      const user = await requireUser()
      return await withUserDb(user.id, async (tx) => {
        const doc = await docRepository.findById(tx, parsed.data.docId)
        if (!doc) return err(new NotFoundError('Doc が見つかりません'))
        await requireWorkspaceMember(doc.workspaceId, 'member')

        const comment = await commentOnDocRepository.insert(tx, {
          docId: doc.id,
          body: parsed.data.body,
          authorActorType: 'user',
          authorActorId: user.id,
        })
        await recordAudit(tx, {
          workspaceId: doc.workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_doc',
          targetId: comment.id,
          action: 'create',
          after: comment,
        })
        return ok(comment)
      })
    },

    async update(input: unknown): Promise<Result<CommentOnDoc>> {
      const parsed = UpdateCommentInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      return await _mutateOnDocWithGuard(parsed.data.id, async (tx, before, workspaceId, user) => {
        const updated = await commentOnDocRepository.updateWithLock(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
          parsed.data.patch as Partial<Parameters<typeof commentOnDocRepository.insert>[1]>,
        )
        if (!updated) return err(new ConflictError())
        if (updated.authorActorId !== user.id || updated.authorActorType !== 'user') {
          return err(new ValidationError('自分のコメントのみ編集できます'))
        }
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_doc',
          targetId: updated.id,
          action: 'update',
          before,
          after: updated,
        })
        return ok(updated)
      })
    },

    async softDelete(input: unknown): Promise<Result<CommentOnDoc>> {
      const parsed = SoftDeleteCommentInputSchema.safeParse(input)
      if (!parsed.success)
        return err(new ValidationError('入力内容を確認してください', parsed.error))

      return await _mutateOnDocWithGuard(parsed.data.id, async (tx, before, workspaceId, user) => {
        if (before.authorActorId !== user.id || before.authorActorType !== 'user') {
          return err(new ValidationError('自分のコメントのみ削除できます'))
        }
        const updated = await commentOnDocRepository.softDelete(
          tx,
          parsed.data.id,
          parsed.data.expectedVersion,
        )
        if (!updated) return err(new ConflictError())
        await recordAudit(tx, {
          workspaceId,
          actorType: 'user',
          actorId: user.id,
          targetType: 'comment_on_doc',
          targetId: updated.id,
          action: 'delete',
          before,
        })
        return ok(updated)
      })
    },

    async list(docId: string) {
      const user = await requireUser()
      return await withUserDb(user.id, async (tx) => {
        const doc = await docRepository.findById(tx, docId)
        if (!doc) return []
        await requireWorkspaceMember(doc.workspaceId, 'viewer')
        return await commentOnDocRepository.listByDoc(tx, docId)
      })
    },
  },
}

type Tx = Parameters<Parameters<typeof withUserDb>[1]>[0]

async function _mutateOnItemWithGuard(
  commentId: string,
  fn: (
    tx: Tx,
    before: CommentOnItem,
    workspaceId: string,
    user: { id: string },
  ) => Promise<Result<CommentOnItem>>,
): Promise<Result<CommentOnItem>> {
  const user = await requireUser()
  return await withUserDb(user.id, async (tx) => {
    const before = await commentOnItemRepository.findById(tx, commentId)
    if (!before) return err(new NotFoundError('コメントが見つかりません'))
    const item = await itemRepository.findById(tx, before.itemId)
    if (!item) return err(new NotFoundError('親 Item が見つかりません'))
    await requireWorkspaceMember(item.workspaceId, 'member')
    return await fn(tx, before, item.workspaceId, user)
  })
}

async function _mutateOnDocWithGuard(
  commentId: string,
  fn: (
    tx: Tx,
    before: CommentOnDoc,
    workspaceId: string,
    user: { id: string },
  ) => Promise<Result<CommentOnDoc>>,
): Promise<Result<CommentOnDoc>> {
  const user = await requireUser()
  return await withUserDb(user.id, async (tx) => {
    const before = await commentOnDocRepository.findById(tx, commentId)
    if (!before) return err(new NotFoundError('コメントが見つかりません'))
    const doc = await docRepository.findById(tx, before.docId)
    if (!doc) return err(new NotFoundError('親 Doc が見つかりません'))
    await requireWorkspaceMember(doc.workspaceId, 'member')
    return await fn(tx, before, doc.workspaceId, user)
  })
}
