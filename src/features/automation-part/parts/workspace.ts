/**
 * queue: AP-2 substrate — workspace.* part 群 (read 系特化)。
 *
 * 既存 workspaceService を thin wrap する形で part 化:
 *   - workspace.get_team_context — workspace の team_context (AI prompt 末尾 inject)
 *     を取得 (read 系)
 *
 * 設計メモ:
 *   - workspaceService.getTeamContext は requireWorkspaceMember(workspaceId, 'viewer')
 *     を内部で呼ぶ + Result<T> を返す
 *   - workspaceId は ctx 経由 (input に直接含めない、AP-1 規約)
 *   - read scope (= AP-5 / AP-6 で read scope key で許可可能)
 *   - AC-5「AI 同僚 persona」 で AI が自分の prompt 末尾に inject される workspace
 *     方針を 1 part 経由で取得し、自己整合 (= prompt build にこの値を含める) する経路
 *   - update / settings 系は admin 権限を要求するため AP-3 以降で慎重に扱う
 *     (AI が workspace 設定を勝手に変更するのは方針領域)
 */
import 'server-only'

import { z } from 'zod'

import { workspaceService } from '@/features/workspace/service'

import { definePart, unwrapPartResult } from '../types'

const WorkspaceGetTeamContextInput = z.object({})

const WorkspaceTeamContextOutput = z.object({
  teamContext: z.string(),
})

export const workspaceGetTeamContextPart = definePart({
  id: 'workspace.get_team_context',
  label: 'workspace の team_context を取得',
  description:
    'workspace の team_context (AI prompt 末尾に inject される workspace 方針 / AI 役割の自由 text、最大 4000 文字) を返す。副作用なし、read scope。',
  category: 'item',
  sideEffect: 'read',
  input: WorkspaceGetTeamContextInput,
  output: WorkspaceTeamContextOutput,
  run: async (_input, ctx) => {
    const r = await workspaceService.getTeamContext(ctx.workspaceId)
    return unwrapPartResult('workspace.get_team_context', r)
  },
})
