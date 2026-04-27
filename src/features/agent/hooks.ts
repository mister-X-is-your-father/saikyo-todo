'use client'

/**
 * Agent 関連 TanStack Query mutation hooks。
 *
 * `useDecomposeItem` は Researcher Agent に Item の分解を依頼する。
 * 同期待ちのため isPending が長く (数秒〜30s) なるので、呼び出し側は
 * pending 中は UI をスピナー表示すべし。
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { proposalKeys } from '@/features/decompose-proposal/hooks'
import { itemKeys } from '@/features/item/hooks'

import {
  cancelInvocationAction,
  decomposeGoalAction,
  decomposeGoalViaClaudeAction,
  decomposeItemAction,
  decomposeItemViaClaudeAction,
  researchItemAction,
} from './actions'

export interface DecomposeItemVariables {
  workspaceId: string
  itemId: string
  extraHint?: string
  idempotencyKey?: string
}

/**
 * Phase 6.15 iter149: AI 分解は Claude Max OAuth + claude CLI 経由 (env 不要)
 * を default に切替。proposal staging は通らないため `create_item` で子 Item が
 * 直接作られる UX に変わる (staging が必要な時は decomposeItemAction を直接呼ぶ)。
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
      // CLI 経路は staging を通らないので items 直接 + proposals 両方 invalidate
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
