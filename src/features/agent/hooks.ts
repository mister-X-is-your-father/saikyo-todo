'use client'

/**
 * Agent 関連 TanStack Query mutation hooks。
 *
 * `useDecomposeItem` は Researcher Agent に Item の分解を依頼する。
 * 同期待ちのため isPending が長く (数秒〜30s) なるので、呼び出し側は
 * pending 中は UI をスピナー表示すべし。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { proposalKeys } from '@/features/decompose-proposal/hooks'
import { itemKeys } from '@/features/item/hooks'

import {
  cancelInvocationAction,
  decomposeGoalViaClaudeAction,
  decomposeItemViaClaudeAction,
  generatePlanAction,
  listAgentsAction,
  researchItemViaClaudeAction,
} from './actions'
import { type AgentInvocationProgress, agentProgressKeys } from './realtime'

export const agentKeys = {
  all: ['agents'] as const,
  list: (workspaceId: string) => ['agents', workspaceId, 'list'] as const,
}

/**
 * P0「AI 自動実行モード」 scope A iter3: workspace 内の AI agent を listing する
 * read-only query。AssigneePicker の AI 選択肢、KanbanCard の "AI 担当" badge 等で
 * 使う。1 ws あたり高々 4 行 (pm/researcher/engineer/reviewer) なので staleTime 長め。
 */
export function useWorkspaceAgents(workspaceId: string) {
  return useQuery({
    queryKey: agentKeys.list(workspaceId),
    queryFn: async () => unwrap(await listAgentsAction({ workspaceId })),
    enabled: !!workspaceId,
    staleTime: 60_000,
  })
}

export interface DecomposeItemVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

/**
 * AI 分解は Claude Max OAuth + claude CLI 経由 (env 不要)。
 * staging mode (propose_child_item → agent_decompose_proposals) を使うので、
 * 子タスクは items に直接作成されず UI の承認パネルで確認 → 採用の 2 step になる。
 */
export function useDecomposeItem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: DecomposeItemVariables) =>
      unwrap(
        await decomposeItemViaClaudeAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
      void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(vars.itemId) })
    },
  })
}

/**
 * Phase 6.15 iter130: Goal を Researcher で分解する hook。
 * 5〜10 件の Item が root 直下に作られるので items 全体を invalidate。
 */
export interface DecomposeGoalVariables {
  workspaceId: string
  goalId: string
  extraHint?: string
  idempotencyKey?: string
}

/**
 * Phase 6.15 iter149: Goal AI 分解も CLI 経路 (env 不要) を default に切替。
 */
export function useDecomposeGoal(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: DecomposeGoalVariables) =>
      unwrap(
        await decomposeGoalViaClaudeAction({
          workspaceId: vars.workspaceId,
          goalId: vars.goalId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export interface ResearchItemVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

// useResearchItem は workspaceId を vars.workspaceId から受ける (useDecomposeItem とは
// シグネチャが異なる点に注意: Doc 新規作成は items キャッシュ invalidate が不要のため
// factory 引数で workspace を bind する必要がない)
//
// iter520 (queue: researcher SDK→CLI run path): AI 調査も Claude Max OAuth + claude CLI
// 経由 (env 不要) を default に切替。SDK fallback hook (useResearchItemViaSDK) は
// iter533 で削除 (どこからも参照されておらず ANTHROPIC_API_KEY 利用は禁止方針のため)。
export function useResearchItem() {
  return useMutation({
    mutationFn: async (vars: ResearchItemVariables) =>
      unwrap(
        await researchItemViaClaudeAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
  })
}

export interface GeneratePlanVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

/**
 * P0「AI 自動実行モード」 scope A: AI 担当 Item の「実行計画 (Plan)」を Researcher
 * に書かせ、本 Item の comment に post する mutation。CLI 経路 (env 不要)。
 * 完了時に該当 Item の comments query を invalidate (UI で plan comment が見える)。
 */
export function useGeneratePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: GeneratePlanVariables) =>
      unwrap(
        await generatePlanAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: itemKeys.list(vars.workspaceId) })
      // comment list は item key prefix で別途 invalidate されるが、明示的に
      // comment scoped queryKey を持つ caller (ItemEditDialog) は再 fetch すべし。
      void qc.invalidateQueries({ queryKey: ['comments', vars.itemId] })
    },
  })
}

export interface CancelInvocationVariables {
  invocationId: string
  /**
   * iter1490 (mode-F): cancel click 後、realtime UPDATE が届く ~2-3 秒の間「分解中…」
   * spinner / streaming text が残り続ける flicker を消すため、agentProgressKeys
   * cache を即時 status='cancelled' に上書きしたい時に渡す。realtime が確定値で
   * 上書きするので、cache key と invocationId が一致した時のみ optimistic に書く。
   */
  targetItemId?: string
}

/**
 * 実行中 invocation を中止する。Server Action は status='cancelled' を立てるだけで、
 * tool-loop 側 (researcher / pm service) の shouldAbort poll が次の iteration で
 * 検知してループを抜ける (~2-3 秒で UI が完了状態に遷移)。
 *
 * iter1490 (mode-F): targetItemId 渡し時は agentProgressKeys cache を即時 cancelled に
 * setQueryData。realtime UPDATE が来るまでの「分解中」 spinner / streaming text 残留を消す。
 */
export function useCancelInvocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: CancelInvocationVariables) =>
      unwrap(await cancelInvocationAction({ invocationId: vars.invocationId })),
    onMutate: (vars) => {
      if (!vars.targetItemId) return undefined
      const queryKey = agentProgressKeys.byTarget(vars.targetItemId)
      void qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<AgentInvocationProgress>(queryKey)
      if (prev && prev.invocationId === vars.invocationId) {
        qc.setQueryData<AgentInvocationProgress>(queryKey, { ...prev, status: 'cancelled' })
      }
      return { queryKey, prev }
    },
    onError: (_e, _vars, ctx) => {
      if (!ctx?.queryKey) return
      qc.setQueryData(ctx.queryKey, ctx.prev)
    },
  })
}
