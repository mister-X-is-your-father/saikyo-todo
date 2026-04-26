'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  addItemDependencyAction,
  listItemDependenciesAction,
  listWorkspaceBlocksDependenciesAction,
  removeItemDependencyAction,
} from './actions'
import type { AddItemDependencyInput, RemoveItemDependencyInput } from './schema'

export const itemDependencyKeys = {
  all: ['item-dependencies'] as const,
  forItem: (itemId: string) => [...itemDependencyKeys.all, itemId] as const,
  forWorkspace: (workspaceId: string) =>
    [...itemDependencyKeys.all, 'workspace', workspaceId] as const,
}

export function useItemDependencies(itemId: string | null) {
  return useQuery({
    queryKey: itemDependencyKeys.forItem(itemId ?? '__none__'),
    queryFn: async () => unwrap(await listItemDependenciesAction(itemId as string)),
    enabled: Boolean(itemId),
  })
}

/**
 * Workspace 横断の blocks edges (Gantt 依存線描画 / critical path 計算用)。
 */
export function useWorkspaceBlocksDependencies(workspaceId: string | null) {
  return useQuery({
    queryKey: itemDependencyKeys.forWorkspace(workspaceId ?? '__none__'),
    queryFn: async () => unwrap(await listWorkspaceBlocksDependenciesAction(workspaceId as string)),
    enabled: Boolean(workspaceId),
  })
}

export function useAddItemDependency(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddItemDependencyInput) =>
      unwrap(await addItemDependencyAction(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
    },
  })
}

export function useRemoveItemDependency(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveItemDependencyInput) =>
      unwrap(await removeItemDependencyAction(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemDependencyKeys.forItem(itemId) })
    },
  })
}
