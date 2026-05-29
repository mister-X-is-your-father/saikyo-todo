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
    // iter1464 (mode-F): ItemEditDialog 内 artifact (input/output) 削除後 ~200-500ms
    // 待ちで artifact row が残って見える flicker (useDeleteWorkflow iter1442 と
    // 同 root cause、item-metadata 版)。
    onMutate: (input: RemoveItemIoArtifactInput) => {
      void qc.cancelQueries({ queryKey: itemMetadataKeys.artifacts(itemId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(itemMetadataKeys.artifacts(itemId))
      if (snapshot) {
        qc.setQueryData(
          itemMetadataKeys.artifacts(itemId),
          snapshot.filter((a) => a.id !== input.id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(itemMetadataKeys.artifacts(itemId), ctx.snapshot)
    },
    onSettled: () => {
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
    // iter1464 (mode-F): stakeholder (関係者) 削除後 ~200-500ms 待ちで row が
    // 残って見える flicker。stakeholder は (itemId, userId) 複合 key で identity。
    onMutate: (input: RemoveItemStakeholderInput) => {
      void qc.cancelQueries({ queryKey: itemMetadataKeys.stakeholders(itemId) })
      const snapshot = qc.getQueryData<Array<{ userId: string }>>(
        itemMetadataKeys.stakeholders(itemId),
      )
      if (snapshot) {
        qc.setQueryData(
          itemMetadataKeys.stakeholders(itemId),
          snapshot.filter((s) => s.userId !== input.userId),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(itemMetadataKeys.stakeholders(itemId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: itemMetadataKeys.stakeholders(itemId) })
    },
  })
}
