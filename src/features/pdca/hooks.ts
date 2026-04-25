'use client'

import { useQuery } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { pdcaSummaryAction } from './actions'

export const pdcaKeys = {
  all: ['pdca'] as const,
  summary: (workspaceId: string, opts: { from?: string; to?: string } = {}) =>
    [...pdcaKeys.all, 'summary', workspaceId, opts] as const,
}

export function usePdcaSummary(
  workspaceId: string,
  options: { from?: string; to?: string; checkWindowDays?: number; enabled?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && Boolean(workspaceId)
  return useQuery({
    queryKey: pdcaKeys.summary(workspaceId, { from: options.from, to: options.to }),
    queryFn: async () => unwrap(await pdcaSummaryAction(workspaceId, options)),
    enabled,
    // Server Action の連鎖 (router.refresh 副作用) で他 mutation flow と競合しないよう
    // 1 分 stale + focus refetch off (§5.17 と同パターン)
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
