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
    // iter1471 (mode-F): ItemEditDialog の goal textarea 保存後 ~200-500ms 待ちで
    // visible が更新前のまま見える flicker (useUpdateItem iter1453 と同 root cause、
    //  goal 単体 field 編集版)。items query (multi-key) を横断 setQueryData で
    // item.goal field を即書換。
    onMutate: (input: SetItemGoalInput) => {
      void qc.cancelQueries({ queryKey: ['items'] })
      const snapshots = qc.getQueriesData<Array<{ id: string } & Record<string, unknown>>>({
        queryKey: ['items'],
      })
      for (const [key, prev] of snapshots) {
        if (!Array.isArray(prev)) continue
        qc.setQueryData(
          key,
          prev.map((it) => (it.id === input.id ? { ...it, goal: input.goal } : it)),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: (_data, _e, vars) => {
      void qc.invalidateQueries({ queryKey: ['items'] })
      void qc.invalidateQueries({ queryKey: ['items', 'detail', vars.id] })
    },
  })
}

export function useAddItemArtifact(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddItemIoArtifactInput) => unwrap(await addItemArtifactAction(input)),
    // iter1475 (mode-F、Add 系): ItemEditDialog 内 artifact (input/output) 追加後
    // ~200-500ms 待ちで artifact row が現れない flicker (useAddItemDependency iter1474
    // と同 root cause、Add 系 helper パターンの artifact 版)。temp id ('temp-' + uuid)
    // で仮 row を append、server canonical fetch (onSettled invalidate) で正規 id に上書き。
    onMutate: (input: AddItemIoArtifactInput) => {
      void qc.cancelQueries({ queryKey: itemMetadataKeys.artifacts(itemId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        itemMetadataKeys.artifacts(itemId),
      )
      if (snapshot) {
        const tempId = `temp-${crypto.randomUUID()}`
        const tempEntry = {
          id: tempId,
          itemId: input.itemId,
          kind: input.kind,
          label: input.label,
          url: input.url ?? null,
          filePath: input.filePath ?? null,
          mime: input.mime ?? null,
          description: input.description ?? null,
          createdAt: new Date(),
          version: 0,
        }
        qc.setQueryData(itemMetadataKeys.artifacts(itemId), [...snapshot, tempEntry])
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
    // iter1475 (mode-F、Add 系): stakeholder (関係者) 追加後 ~200-500ms 待ちで
    // row が現れない flicker。stakeholder は (itemId, userId) 複合 key で identity
    // (temp id 不要)、input field をそのまま append。
    onMutate: (input: AddItemStakeholderInput) => {
      void qc.cancelQueries({ queryKey: itemMetadataKeys.stakeholders(itemId) })
      const snapshot = qc.getQueryData<Array<{ userId: string } & Record<string, unknown>>>(
        itemMetadataKeys.stakeholders(itemId),
      )
      if (snapshot && !snapshot.some((s) => s.userId === input.userId)) {
        const tempEntry = { itemId: input.itemId, userId: input.userId, createdAt: new Date() }
        qc.setQueryData(itemMetadataKeys.stakeholders(itemId), [...snapshot, tempEntry])
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
