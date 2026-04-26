'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  getBudgetStatusAction,
  getMonthlyCostAction,
  updateMonthlyCostLimitAction,
} from './cost-actions'

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

export function useUpdateMonthlyCostLimit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: UpdateBudgetVariables) =>
      unwrap(await updateMonthlyCostLimitAction(vars)),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['agent', 'budget', vars.workspaceId] })
      void qc.invalidateQueries({ queryKey: ['agent', 'cost', vars.workspaceId] })
    },
  })
}
