'use client'

import { useQuery } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { getMonthlyCostAction } from './cost-actions'

export function useMonthlyCost(workspaceId: string, months = 12) {
  return useQuery({
    queryKey: ['agent', 'cost', workspaceId, months],
    queryFn: async () => unwrap(await getMonthlyCostAction(workspaceId, months)),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
}
