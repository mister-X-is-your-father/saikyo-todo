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
  decomposeGoalAction,
  decomposeGoalViaClaudeAction,
  decomposeItemAction,
  decomposeItemViaClaudeAction,
  listAgentsAction,
  researchItemAction,
} from './actions'

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

/** SDK 直接利用 (proposal staging) で分解する旧経路。env (ANTHROPIC_API_KEY) 必須。 */
export function useDecomposeItemViaSDK(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: DecomposeItemVariables) =>
      unwrap(
        await decomposeItemAction({
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

/** SDK 直接利用の旧経路 (env 必須)。テスト / fallback 用に残置。 */
export function useDecomposeGoalViaSDK(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: DecomposeGoalVariables) =>
      unwrap(
        await decomposeGoalAction({
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
export function useResearchItem() {
  return useMutation({
    mutationFn: async (vars: ResearchItemVariables) =>
      unwrap(
        await researchItemAction({
          workspaceId: vars.workspaceId,
          itemId: vars.itemId,
          extraHint: vars.extraHint,
          idempotencyKey: vars.idempotencyKey,
        }),
      ),
  })
}

/**
 * 実行中 invocation を中止する。Server Action は status='cancelled' を立てるだけで、
 * tool-loop 側 (researcher / pm service) の shouldAbort poll が次の iteration で
 * 検知してループを抜ける (~2-3 秒で UI が完了状態に遷移)。
 */
export function useCancelInvocation() {
  return useMutation({
    mutationFn: async (invocationId: string) =>
      unwrap(await cancelInvocationAction({ invocationId })),
  })
}
