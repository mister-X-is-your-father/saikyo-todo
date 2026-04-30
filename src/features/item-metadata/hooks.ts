'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  addItemArtifactAction,
  addItemStakeholderAction,
  listItemArtifactsAction,
  listItemStakeholdersAction,
  removeItemArtifactAction,
  removeItemStakeholderAction,
  setItemGoalAction,
} from './actions'
import type {
  AddItemIoArtifactInput,
  AddItemStakeholderInput,
  RemoveItemIoArtifactInput,
  RemoveItemStakeholderInput,
  SetItemGoalInput,
} from './schema'

export const itemMetadataKeys = {
  all: ['item-metadata'] as const,
  artifacts: (itemId: string) => [...itemMetadataKeys.all, 'artifacts', itemId] as const,
  stakeholders: (itemId: string) => [...itemMetadataKeys.all, 'stakeholders', itemId] as const,
}

export function useItemArtifacts(itemId: string) {
  return useQuery({
    queryKey: itemMetadataKeys.artifacts(itemId),
    queryFn: async () => unwrap(await listItemArtifactsAction(itemId)),
    enabled: Boolean(itemId),
  })
}

export function useItemStakeholders(itemId: string) {
  return useQuery({
    queryKey: itemMetadataKeys.stakeholders(itemId),
    queryFn: async () => unwrap(await listItemStakeholdersAction(itemId)),
    enabled: Boolean(itemId),
  })
}

export function useSetItemGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SetItemGoalInput) => unwrap(await setItemGoalAction(input)),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['items'] })
      void qc.invalidateQueries({ queryKey: ['items', 'detail', vars.id] })
    },
  })
}

export function useAddItemArtifact(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddItemIoArtifactInput) => unwrap(await addItemArtifactAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemMetadataKeys.artifacts(itemId) })
    },
  })
}

export function useRemoveItemArtifact(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveItemIoArtifactInput) =>
      unwrap(await removeItemArtifactAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemMetadataKeys.artifacts(itemId) })
    },
  })
}

export function useAddItemStakeholder(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddItemStakeholderInput) =>
      unwrap(await addItemStakeholderAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemMetadataKeys.stakeholders(itemId) })
    },
  })
}

export function useRemoveItemStakeholder(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RemoveItemStakeholderInput) =>
      unwrap(await removeItemStakeholderAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: itemMetadataKeys.stakeholders(itemId) })
    },
  })
}
