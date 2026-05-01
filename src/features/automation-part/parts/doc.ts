/**
 * queue: AP-2 substrate — doc.* part 群 (sample 移植)。
 *
 * 既存 docService を thin wrap する形で part 化。AP-2 第 5 弾:
 *   - doc.create (workspace に doc を 1 件作成、idempotencyKey 必須)
 *   - doc.list (read 系、workspace の doc 一覧)
 *
 * update / softDelete は AP-2 第 6 弾以降で。
 *
 * 設計メモ:
 *   - docService.create は requireWorkspaceMember(workspaceId, 'member') を呼ぶ
 *   - workspaceId は ctx 経由 (input に直接含めない)
 *   - body は 0+ 文字 (空 doc も許容、後で update で書く想定)
 *   - sourceTemplateId は doc を template から派生する場合に指定 (任意)
 *   - idempotencyKey で workflow 再実行 / agent retry の duplicate insert 防止
 *   - AC-1 系で AI が「調査結果を Doc 化」 する path の substrate
 */
import 'server-only'

import { z } from 'zod'

import { DocSelectSchema } from '@/features/doc/schema'
import { docService } from '@/features/doc/service'

import { definePart, unwrapPartResult } from '../types'

const DocCreateInput = z.object({
  title: z.string().min(1).max(500),
  body: z.string().optional(),
  sourceTemplateId: z.string().uuid().nullish(),
  idempotencyKey: z.string().uuid(),
})

export const docCreatePart = definePart({
  id: 'doc.create',
  label: 'doc を作成',
  description:
    'workspace に doc を 1 件作成する。idempotencyKey で重複 insert を防止、commit 後 embedding ジョブが enqueue される。',
  category: 'doc',
  sideEffect: 'write',
  input: DocCreateInput,
  output: DocSelectSchema,
  run: async (input, ctx) => {
    const r = await docService.create({
      workspaceId: ctx.workspaceId,
      title: input.title,
      body: input.body ?? '',
      sourceTemplateId: input.sourceTemplateId ?? null,
      idempotencyKey: input.idempotencyKey,
    })
    return unwrapPartResult('doc.create', r)
  },
})

const DocListInput = z.object({})

export const docListPart = definePart({
  id: 'doc.list',
  label: 'doc 一覧を取得',
  description: 'workspace の doc 一覧を返す。副作用なし、read scope。',
  category: 'doc',
  sideEffect: 'read',
  input: DocListInput,
  output: z.array(DocSelectSchema),
  run: async (_input, ctx) => {
    return await docService.list(ctx.workspaceId)
  },
})
