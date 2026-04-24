'use client'

import { useQuery } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { getBurndownAction, getMustSummaryAction } from './actions'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  mustSummary: (workspaceId: string) => [...dashboardKeys.all, 'must', workspaceId] as const,
  burndown: (workspaceId: string, days: number) =>
    [...dashboardKeys.all, 'burndown', workspaceId, days] as const,
}

export function useMustSummary(workspaceId: string) {
  return useQuery({
    queryKey: dashboardKeys.mustSummary(workspaceId),
    queryFn: async () => unwrap(await getMustSummaryAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useBurndown(workspaceId: string, days = 14) {
  return useQuery({
    queryKey: dashboardKeys.burndown(workspaceId, days),
    queryFn: async () => unwrap(await getBurndownAction({ workspaceId, days })),
    enabled: Boolean(workspaceId),
  })
}
