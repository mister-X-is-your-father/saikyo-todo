/**
 * queue: AP-2 substrate — template.* part 群 (read 系特化)。
 *
 * 既存 templateService を thin wrap する形で part 化:
 *   - template.list (workspace の Template 一覧、kind filter optional、read scope)
 *
 * 設計メモ:
 *   - templateService.list は requireWorkspaceMember(viewer) を内部で呼ぶ + Promise<Template[]>
 *     を返す (Result<T> ではない、type 互換のため part 内 unwrap 不要)
 *   - workspaceId は ctx 経由 (input に直接含めない、AP-1 規約)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - kind filter: 'manual' (手動展開) / 'recurring' (cron で自動展開)
 *   - AC-1「AI に任せた」 で AI が「workspace に既存の Template から似たものを
 *     instantiate してから手直し」 経路の substrate
 *   - createTemplate / instantiate は AP-3 以降で慎重に扱う (= AI が勝手に
 *     Template 量産すると workspace が混乱する、人間 review 必須)
 */
import 'server-only'

import { z } from 'zod'

import { TemplateSelectSchema } from '@/features/template/schema'
import { templateService } from '@/features/template/service'

import { definePart } from '../types'

const TemplateListInput = z.object({
  kind: z.enum(['manual', 'recurring']).optional(),
})

export const templateListPart = definePart({
  id: 'template.list',
  label: 'Template 一覧を取得',
  description:
    'workspace の Template 一覧 (kind=manual / recurring の filter optional) を返す。副作用なし、read scope。',
  category: 'item',
  sideEffect: 'read',
  input: TemplateListInput,
  output: z.array(TemplateSelectSchema),
  run: async (input, ctx) => {
    return await templateService.list(ctx.workspaceId, input.kind ? { kind: input.kind } : {})
  },
})
