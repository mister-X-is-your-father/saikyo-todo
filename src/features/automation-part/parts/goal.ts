/**
 * queue: AP-2 substrate — goal.* part 群 (read 系特化)。
 *
 * 既存 okrService を thin wrap する形で part 化:
 *   - goal.list (workspace の Goal 一覧、active / completed / archived 全部、read scope)
 *
 * 設計メモ:
 *   - okrService.listGoals は requireWorkspaceMember(workspaceId, 'viewer') を
 *     内部で呼ぶ + Result<T> を返す
 *   - workspaceId は ctx 経由 (input に直接含めない、AP-1 規約)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - createGoal / updateGoal / KeyResult 関連は UI 経由の人間管理が現状の運用
 *     のため AP-3 以降で慎重に扱う (AI 自動 Goal 創出は方針が定まってから)
 */
import 'server-only'

import { z } from 'zod'

import { GoalSelectSchema } from '@/features/okr/schema'
import { okrService } from '@/features/okr/service'

import { definePart, unwrapPartResult } from '../types'

const GoalListInput = z.object({})

export const goalListPart = definePart({
  id: 'goal.list',
  label: 'Goal 一覧を取得',
  description:
    'workspace の Goal 一覧 (active / completed / archived 全部) を返す。副作用なし、read scope。',
  category: 'goal',
  sideEffect: 'read',
  input: GoalListInput,
  output: z.array(GoalSelectSchema),
  run: async (_input, ctx) => {
    const r = await okrService.listGoals(ctx.workspaceId)
    return unwrapPartResult('goal.list', r)
  },
})
