/**
 * queue: AP-2 substrate — tag.* part 群 (sample 移植)。
 *
 * 既存 tagService を thin wrap する形で part 化。AP-2 第 6 弾:
 *   - tag.list (read 系、workspace の tag 一覧)
 *
 * create / softDelete は AP-3 以降で (= UI で人間管理が現状の運用、AI 自動 tag 創出は
 * 慎重に扱う)。
 *
 * 設計メモ:
 *   - tagService.listByWorkspace は requireWorkspaceMember(workspaceId, 'viewer')
 *   - workspaceId は ctx 経由 (input に直接含めない)
 *   - read scope (= AP-5 / AP-6 で read key で許可可能)
 */
import 'server-only'

import { z } from 'zod'

import { TagSelectSchema } from '@/features/tag/schema'
import { tagService } from '@/features/tag/service'

import { definePart } from '../types'

const TagListInput = z.object({})

export const tagListPart = definePart({
  id: 'tag.list',
  label: 'tag 一覧を取得',
  description: 'workspace の tag 一覧を返す。副作用なし、read scope。',
  category: 'tag',
  sideEffect: 'read',
  input: TagListInput,
  output: z.array(TagSelectSchema),
  run: async (_input, ctx) => {
    return await tagService.listByWorkspace(ctx.workspaceId)
  },
})
