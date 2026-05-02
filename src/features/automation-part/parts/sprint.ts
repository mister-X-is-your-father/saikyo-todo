/**
 * queue: AP-2 substrate — sprint.* part 群 (read 系特化)。
 *
 * 既存 sprintService を thin wrap する形で part 化:
 *   - sprint.list (workspace の Sprint 一覧、planning / active / completed / cancelled
 *     全部、read scope)
 *
 * 設計メモ:
 *   - sprintService.list は requireWorkspaceMember(workspaceId, 'viewer') を内部で呼ぶ
 *     + Result<T> を返す
 *   - workspaceId は ctx 経由 (input に直接含めない、AP-1 規約)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - createSprint / completeSprint / cancelSprint 関連は UI 経由の人間管理が現状の
 *     運用のため AP-3 以降で慎重に扱う (AI 自動 Sprint 開閉は workspace 経営の
 *     意思決定領域)
 */
import 'server-only'

import { z } from 'zod'

import { SprintSelectSchema } from '@/features/sprint/schema'
import { sprintService } from '@/features/sprint/service'

import { definePart, unwrapPartResult } from '../types'

const SprintListInput = z.object({})

export const sprintListPart = definePart({
  id: 'sprint.list',
  label: 'Sprint 一覧を取得',
  description:
    'workspace の Sprint 一覧 (planning / active / completed / cancelled 全部) を返す。副作用なし、read scope。',
  category: 'goal',
  sideEffect: 'read',
  input: SprintListInput,
  output: z.array(SprintSelectSchema),
  run: async (_input, ctx) => {
    const r = await sprintService.list(ctx.workspaceId)
    return unwrapPartResult('sprint.list', r)
  },
})
