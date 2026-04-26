'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  addItemDependencyAction,
  listItemDependenciesAction,
  removeItemDependencyAction,
} from './actions'
import type { AddItemDependencyInput, RemoveItemDependencyInput } from './schema'

export const itemDependencyKeys = {
  all: ['item-dependencies'] as const,
  forItem: (itemId: string) => [...itemDependencyKeys.all, itemId] as const,
}

export function useItemDependencies(itemId: string | null) {
  return useQuery({
    queryKey: itemDependencyKeys.forItem(itemId ?? '__none__'),
    queryFn: async () => unwrap(await listItemDependenciesAction(itemId as string)),
    enabled: Boolean(itemId),
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
