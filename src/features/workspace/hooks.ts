'use client'

import { useQuery } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { listWorkspaceStatusesAction } from './actions'

export const workspaceKeys = {
  all: ['workspace'] as const,
  statuses: (workspaceId: string) => [...workspaceKeys.all, 'statuses', workspaceId] as const,
}

/** Kanban 列定義。create_workspace RPC が todo / in_progress / done を初期登録。 */
export function useWorkspaceStatuses(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.statuses(workspaceId),
    queryFn: async () => unwrap(await listWorkspaceStatusesAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000, // column 定義はあまり変わらないので長め
  })
}
