'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { getPersonalPeriodGoalAction, upsertPersonalPeriodGoalAction } from './actions'
import type { Period, UpsertGoalInput } from './schema'

export const personalPeriodGoalKeys = {
  all: ['personal-period-goals'] as const,
  one: (workspaceId: string, period: Period, periodKey: string) =>
    [...personalPeriodGoalKeys.all, workspaceId, period, periodKey] as const,
}

export function usePersonalPeriodGoal(workspaceId: string, period: Period, periodKey: string) {
  return useQuery({
    queryKey: personalPeriodGoalKeys.one(workspaceId, period, periodKey),
    queryFn: async () =>
      unwrap(await getPersonalPeriodGoalAction({ workspaceId, period, periodKey })),
    enabled: Boolean(workspaceId && period && periodKey),
  })
}

export function useUpsertPersonalPeriodGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertGoalInput) =>
      unwrap(await upsertPersonalPeriodGoalAction(input)),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: personalPeriodGoalKeys.one(vars.workspaceId, vars.period, vars.periodKey),
      })
    },
  })
}
