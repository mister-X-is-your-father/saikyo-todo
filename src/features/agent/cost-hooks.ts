'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  getBudgetStatusAction,
  getMonthlyCostAction,
  updateMonthlyCostLimitAction,
} from './cost-actions'
import type { BudgetStatus } from './cost-budget'

export function useMonthlyCost(workspaceId: string, months = 12) {
  return useQuery({
    queryKey: ['agent', 'cost', workspaceId, months],
    queryFn: async () => unwrap(await getMonthlyCostAction(workspaceId, months)),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
}

export function useBudgetStatus(workspaceId: string) {
  return useQuery({
    queryKey: ['agent', 'budget', workspaceId],
    queryFn: async () => unwrap(await getBudgetStatusAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  })
}

export interface UpdateBudgetVariables {
  workspaceId: string
  monthlyCostLimitUsd: number | null
  costWarnThresholdRatio?: number
}

/**
 * iter1491 (mode-F): budget 上限 / 警告閾値の保存 click 後 ~200-500ms 待ちで
 * 「当月実績 / 上限」 / progress bar / 警告 chip が更新されない flicker。
 * limit / warnThreshold / 派生 (ratio / warnTriggered / exceeded) を spent そのまま
 * で即時再計算して setQueryData、realtime invalidate で確定値上書き、onError rollback。
 */
export function useUpdateMonthlyCostLimit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: UpdateBudgetVariables) =>
      unwrap(await updateMonthlyCostLimitAction(vars)),
    onMutate: (vars) => {
      const queryKey = ['agent', 'budget', vars.workspaceId] as const
      void qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<BudgetStatus>(queryKey)
      if (prev) {
        const limit = vars.monthlyCostLimitUsd
        const warnThreshold = vars.costWarnThresholdRatio ?? prev.warnThreshold
        const ratio = limit !== null && limit > 0 ? prev.spent / limit : 0
        qc.setQueryData<BudgetStatus>(queryKey, {
          ...prev,
          limit,
          warnThreshold,
          ratio,
          warnTriggered: limit !== null && ratio >= warnThreshold,
          exceeded: limit !== null && prev.spent >= limit,
        })
      }
      return { queryKey, prev }
    },
    onError: (_e, _vars, ctx) => {
      if (!ctx?.queryKey) return
      qc.setQueryData(ctx.queryKey, ctx.prev)
    },
    onSettled: (_data, _err, vars) => {
      void qc.invalidateQueries({ queryKey: ['agent', 'budget', vars.workspaceId] })
      void qc.invalidateQueries({ queryKey: ['agent', 'cost', vars.workspaceId] })
    },
  })
}
