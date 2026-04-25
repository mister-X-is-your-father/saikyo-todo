'use client'

import { useQuery } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { listAuditByTargetItemAction, listAuditByWorkspaceAction } from './actions'

export const auditKeys = {
  all: ['audit'] as const,
  item: (itemId: string) => [...auditKeys.all, 'item', itemId] as const,
  workspace: (workspaceId: string) => [...auditKeys.all, 'workspace', workspaceId] as const,
}

export function useAuditByTargetItem(itemId: string | undefined) {
  return useQuery({
    queryKey: itemId ? auditKeys.item(itemId) : ['audit', 'noop'],
    queryFn: async () => unwrap(await listAuditByTargetItemAction(itemId!)),
    enabled: Boolean(itemId),
  })
}

export function useAuditByWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: auditKeys.workspace(workspaceId),
    queryFn: async () => unwrap(await listAuditByWorkspaceAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}
