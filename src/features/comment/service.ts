import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'

import { recordAudit } from '@/lib/audit'
import { requireUser, requireWorkspaceMember } from '@/lib/auth/guard'
import { profiles, workspaceMembers } from '@/lib/db/schema'
import { adminDb, withUserDb } from '@/lib/db/scoped-client'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

import { docRepository } from '@/features/doc/repository'
import { buildAppHref, notifyMentionEmail } from '@/features/email/notify'
import { itemRepository } from '@/features/item/repository'
import { notificationRepository } from '@/features/notification/repository'
import type { MentionPayload } from '@/features/notification/schema'

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
        // mention 通知 (best-effort, comment 本体は既に commit 確定)
        await _emitMentionNotifications({
          workspaceId: item.workspaceId,
          authorUserId: user.id,
          commentId: comment.id,
          itemId: item.id,
          body: parsed.data.body,
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

// ----------------------------------------------------------------------------
// mention 抽出 + 通知発火
// ----------------------------------------------------------------------------

/**
 * 本文中の `@<displayName>` を抽出する。
 *
 * - `@` の直後 1 文字以上の "言及候補トークン" (空白 / 改行 / 句読点で区切る)
 * - 全角・半角・日本語混在を許容するため、ホワイトリストではなく
 *   「区切り文字以外の連続文字列」を 1 トークンとして拾う
 * - email アドレス (`a@b.com`) を誤爆しないよう、`@` の直前が単語文字なら除外
 * - 重複は除去
 *
 * 戻り値はトークン (display_name 候補) の集合。実在する profile かはここでは確認しない。
 */
export function extractMentionTokens(body: string): string[] {
  if (!body) return []
  // mention 区切り: 空白系 + 一般的な句読点 (半角/全角)
  const stop = /[\s,，、。.!?！？:：;；()（）[\]【】"'`<>]/u
  const tokens = new Set<string>()
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '@') continue
    // email 等の誤爆回避: 直前が単語文字なら skip
    const prev = body[i - 1]
    if (prev && /[\w]/.test(prev)) continue
    let j = i + 1
    while (j < body.length && !stop.test(body[j]!)) j++
    const tok = body.slice(i + 1, j)
    if (tok.length > 0) tokens.add(tok)
  }
  return [...tokens]
}

/**
 * comment 作成時に、本文中の @user 言及をスキャンして workspace member の中から
 * 該当する displayName を解決し、mention 通知を発行する。
 *
 * - best-effort: notification insert が失敗しても親 (comment 作成) を巻き込まない
 *   よって `withUserDb` の Tx ではなく adminDb で別 Tx を張る
 * - 自己言及 (author 自身) は skip
 * - 同一 displayName が workspace 内に複数いた場合 (将来 unique でなくなる可能性) は
 *   全員に送る (誤爆コストは低、過小通知コストは高い)
 */
async function _emitMentionNotifications(args: {
  workspaceId: string
  authorUserId: string
  commentId: string
  /** mention にひもづける item id (UI で deep link に使う) */
  itemId: string
  body: string
}): Promise<void> {
  // email dispatch を commit 後に行うために候補を集める
  const emailPending: Array<{ userId: string; mentionedBy: string; itemTitle: string }> = []
  try {
    const tokens = extractMentionTokens(args.body)
    if (tokens.length === 0) return

    await adminDb.transaction(async (tx) => {
      // workspace member に絞った profile を引く (admin で RLS バイパス。
      //  RLS は INSERT を service_role に限定しているため、ここも admin)
      const rows = await tx
        .select({
          userId: profiles.id,
          displayName: profiles.displayName,
        })
        .from(profiles)
        .innerJoin(workspaceMembers, eq(workspaceMembers.userId, profiles.id))
        .where(
          and(
            eq(workspaceMembers.workspaceId, args.workspaceId),
            inArray(profiles.displayName, tokens),
          ),
        )

      if (rows.length === 0) return

      // author の displayName (mentionedBy 用)
      const [authorProfile] = await tx
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, args.authorUserId))
        .limit(1)
      const mentionedBy = authorProfile?.displayName ?? 'unknown'

      const preview = args.body.slice(0, 200)

      // mention email 用に親 Item のタイトルを引く
      const item = await itemRepository.findById(tx, args.itemId)
      const itemTitle = item?.title ?? '(Item)'

      for (const r of rows) {
        if (r.userId === args.authorUserId) continue // 自己言及 skip
        const payload: MentionPayload = {
          itemId: args.itemId,
          commentId: args.commentId,
          mentionedBy,
          preview,
        }
        await notificationRepository.insert(tx, {
          userId: r.userId,
          workspaceId: args.workspaceId,
          type: 'mention',
          payload: payload as unknown as Record<string, unknown>,
        })
        emailPending.push({ userId: r.userId, mentionedBy, itemTitle })
      }
    })
  } catch (e) {
    // best-effort: 通知失敗で親 (comment) を巻き戻さない
    console.error('[comment] mention notification emit failed', e)
    return
  }

  // commit 後に email を配信 (失敗は notify* 内部の try/catch で握り潰される)
  const preview = args.body.slice(0, 200)
  if (emailPending.length > 0) {
    await Promise.all(
      emailPending.map((p) =>
        notifyMentionEmail({
          userId: p.userId,
          workspaceId: args.workspaceId,
          mentionedBy: p.mentionedBy,
          commentBody: preview,
          itemTitle: p.itemTitle,
          href: buildAppHref({ workspaceId: args.workspaceId, itemId: args.itemId }),
        }),
      ),
    )
  }
}
