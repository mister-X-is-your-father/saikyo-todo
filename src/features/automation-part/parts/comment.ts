/**
 * queue: AP-2 substrate — comment.* part 群 (sample 移植)。
 *
 * 既存 commentService.onItem を thin wrap する形で part 化。AP-2 第 3 弾:
 *   - comment.create_on_item (item に AI / human がコメント追加、idempotencyKey 必須)
 *
 * onDoc / update / soft_delete は AP-2 第 4 弾以降で。
 *
 * 設計メモ:
 *   - commentService.onItem.create は内部で itemRepository.findById → workspace 確立 →
 *     requireWorkspaceMember を呼ぶ (= workspaceId は item 経由で確立、part input 不要)
 *   - body は 1-10000 文字、idempotencyKey は呼出元 (workflow 再実行 / agent retry) で
 *     duplicate insert を避けるための uuid
 *   - AC-1「AI に任せた」 で AI が item に進捗 comment を投げる経路で利用
 */
import 'server-only'

import { z } from 'zod'

import { CommentOnItemSelectSchema } from '@/features/comment/schema'
import { commentService } from '@/features/comment/service'

import { definePart, unwrapPartResult } from '../types'

const CommentCreateOnItemInput = z.object({
  itemId: z.string().uuid(),
  body: z.string().min(1).max(10_000),
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
