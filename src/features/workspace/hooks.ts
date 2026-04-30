'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  getTeamContextAction,
  getWorkspaceDefaultModeAction,
  listWorkspaceMembersAction,
  listWorkspaceStatusesAction,
  updateTeamContextAction,
  updateWorkspaceDefaultModeAction,
} from './actions'

export const workspaceKeys = {
  all: ['workspace'] as const,
  statuses: (workspaceId: string) => [...workspaceKeys.all, 'statuses', workspaceId] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, 'members', workspaceId] as const,
  teamContext: (workspaceId: string) =>
    [...workspaceKeys.all, 'team-context', workspaceId] as const,
  defaultMode: (workspaceId: string) =>
    [...workspaceKeys.all, 'default-mode', workspaceId] as const,
}

export type WorkspaceMode = 'none' | 'taskchute' | 'gtd'

/**
 * iter517 (queue MS-1): methodology mode (none / taskchute / gtd) を取得。
 * URL ?mode= で per-session override する場合は呼出側で URL state を優先させる。
 */
export function useWorkspaceDefaultMode(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.defaultMode(workspaceId),
    queryFn: async () => unwrap(await getWorkspaceDefaultModeAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateWorkspaceDefaultMode(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (defaultMode: WorkspaceMode) =>
      unwrap(await updateWorkspaceDefaultModeAction({ workspaceId, defaultMode })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.defaultMode(workspaceId) })
    },
  })
}

/** Phase 6.15 iter131: チームコンテキスト (AI prompt 用) */
export function useTeamContext(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.teamContext(workspaceId),
    queryFn: async () => unwrap(await getTeamContextAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateTeamContext(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (teamContext: string) =>
      unwrap(await updateTeamContextAction({ workspaceId, teamContext })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.teamContext(workspaceId) })
    },
  })
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

/** Workspace メンバー一覧 (assignee picker 用)。 */
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => unwrap(await listWorkspaceMembersAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
}
