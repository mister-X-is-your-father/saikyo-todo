/**
 * queue: AP-2 substrate — comment.* part 群 (sample 移植)。
 *
 * 既存 commentService.onItem を thin wrap する形で part 化:
 *   - comment.create_on_item (item に AI / human がコメント追加、idempotencyKey 必須)
 *   - comment.list_for_item (read 系、item の comment 一覧、iter602 で追加)
 *
 * onDoc / update / soft_delete は AP-2 第 5 弾以降で。
 *
 * 設計メモ:
 *   - commentService.onItem.create は内部で itemRepository.findById → workspace 確立 →
 *     requireWorkspaceMember を呼ぶ (= workspaceId は item 経由で確立、part input 不要)
 *   - body は 1-10000 文字、idempotencyKey は呼出元 (workflow 再実行 / agent retry) で
 *     duplicate insert を避けるための uuid
 *   - AC-1「AI に任せた」 で AI が item に進捗 comment を投げる経路で利用
 *   - list は read scope key で許可可能 (= AP-5 / AP-6 の sideEffect filter で write
 *     と分離)
 */
import 'server-only'

import { z } from 'zod'

import { CommentOnDocSelectSchema, CommentOnItemSelectSchema } from '@/features/comment/schema'
import { commentService } from '@/features/comment/service'

import { definePart, unwrapPartResult } from '../types'

// iter1158: body.min(1).max(10000) に ja message 無く zod default 英語が露出。
// iter1086/1092/1126-1157 ja convention で日本語化。
const CommentCreateOnItemInput = z.object({
  itemId: z.string().uuid(),
  body: z
    .string()
    .min(1, 'コメント本文を入力してください')
    .max(10_000, 'コメント本文は 10,000 文字以内で入力してください'),
  idempotencyKey: z.string().uuid(),
})

export const commentCreateOnItemPart = definePart({
  id: 'comment.create_on_item',
  label: 'item にコメントを追加',
  description:
    'item に 1 件のコメントを追加する。idempotencyKey で重複 insert を防止、mention 通知は service 内で best-effort。',
  category: 'comment',
  sideEffect: 'write',
  input: CommentCreateOnItemInput,
  output: CommentOnItemSelectSchema,
  run: async (input) => {
    const r = await commentService.onItem.create({
      itemId: input.itemId,
      body: input.body,
      idempotencyKey: input.idempotencyKey,
    })
    return unwrapPartResult('comment.create_on_item', r)
  },
})

/**
 * iter602 ai-automation: comment.list_for_item part — item の comment 一覧 (read 系)。
 *
 * AC-2「AI に review してもらう」 や AC-1 の続編 (進捗 catch-up) で AI が「これまでの
 * 議論」 を item.id 経由で取得する経路。workspaceId は service が item から確立、
 * 不在 / 他 workspace の item は requireWorkspaceMember(viewer) で拒否される。
 */
const CommentListForItemInput = z.object({
  itemId: z.string().uuid(),
})

export const commentListForItemPart = definePart({
  id: 'comment.list_for_item',
  label: 'item のコメント一覧',
  description:
    '指定 item のコメント一覧を新しい順に返す。副作用なし、read scope。workspaceId は item 経由で確立。',
  category: 'comment',
  sideEffect: 'read',
  input: CommentListForItemInput,
  output: z.array(CommentOnItemSelectSchema),
  run: async (input) => {
    return await commentService.onItem.list(input.itemId)
  },
})

/**
 * iter634 ai-automation: comment.list_for_doc part — Doc のコメント一覧 (read 系)。
 *
 * AC-2「AI に review してもらう」 の Doc 版。AI が「Doc に対する review コメント
 * 履歴」 を取得して 引継ぎ / 既存 review summary に反映する経路の substrate。
 * comment.list_for_item と pair で「item / doc 両 entity に対する議論履歴」 を
 * AI が atomic に取得できる体制 (commentService.onDoc.list を thin wrap)。
 *
 * 設計メモ (item 版と統一):
 *   - workspaceId は service が doc 経由で確立 (input 不要)
 *   - 不在 / 他 ws の doc は requireWorkspaceMember(viewer) で拒否
 *   - service は不在時 [] を返す (Result<T> ではない、type 互換のため part 内で
 *     unwrap 不要)
 */
const CommentListForDocInput = z.object({
  docId: z.string().uuid(),
})

export const commentListForDocPart = definePart({
  id: 'comment.list_for_doc',
  label: 'Doc のコメント一覧',
  description:
    '指定 Doc のコメント一覧を新しい順に返す。副作用なし、read scope。workspaceId は Doc 経由で確立。',
  category: 'comment',
  sideEffect: 'read',
  input: CommentListForDocInput,
  output: z.array(CommentOnDocSelectSchema),
  run: async (input) => {
    return await commentService.onDoc.list(input.docId)
  },
})
