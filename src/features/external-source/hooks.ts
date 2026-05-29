'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  createSourceAction,
  deleteSourceAction,
  listSourceImportsAction,
  listSourcesAction,
  triggerSourcePullAction,
  updateSourceAction,
} from './actions'
import type { CreateSourceInput, UpdateSourceInput } from './schema'

export const externalSourceKeys = {
  all: ['external-sources'] as const,
  list: (workspaceId: string) => [...externalSourceKeys.all, 'list', workspaceId] as const,
  imports: (sourceId: string) => [...externalSourceKeys.all, 'imports', sourceId] as const,
}

export function useSourceImports(sourceId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: externalSourceKeys.imports(sourceId),
    queryFn: async () => unwrap(await listSourceImportsAction(sourceId, 5)),
    enabled: opts.enabled !== false && Boolean(sourceId),
  })
}

export function useExternalSources(workspaceId: string) {
  return useQuery({
    queryKey: externalSourceKeys.list(workspaceId),
    queryFn: async () => unwrap(await listSourcesAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateExternalSource(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSourceInput) => unwrap(await createSourceAction(input)),
    // iter1483 (mode-F、Add 系): /integrations で ExternalSource 作成後 ~200-500ms
    // 待ちで card が現れない flicker (useCreateWorkflow iter1481 と同 root cause、
    //  ExternalSource 版)。
    onMutate: (input: CreateSourceInput) => {
      void qc.cancelQueries({ queryKey: externalSourceKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(externalSourceKeys.list(workspaceId))
      if (snapshot) {
        const tempEntry = {
          id: `temp-${crypto.randomUUID()}`,
          workspaceId: input.workspaceId,
          name: input.name,
          kind: input.kind,
          config: input.config,
          scheduleCron: input.scheduleCron ?? null,
          enabled: false,
          lastPulledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 0,
          deletedAt: null,
          createdBy: '',
        }
        qc.setQueryData(externalSourceKeys.list(workspaceId), [...snapshot, tempEntry])
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(externalSourceKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
    },
  })
}

export function useUpdateExternalSource(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateSourceInput) => unwrap(await updateSourceAction(input)),
    // iter1463 (mode-F): /integrations の External Source 編集保存後 ~200-500ms
    // 待ちで visible name / config / enabled / cron が更新前のまま見える flicker
    // (useUpdateWorkflow iter1451 / useUpdateTemplate iter1452 と同 root cause、
    //  ExternalSource 版)。
    onMutate: (input: UpdateSourceInput) => {
      void qc.cancelQueries({ queryKey: externalSourceKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        externalSourceKeys.list(workspaceId),
      )
      if (snapshot) {
        qc.setQueryData(
          externalSourceKeys.list(workspaceId),
          snapshot.map((s) => (s.id === input.id ? { ...s, ...input.patch } : s)),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(externalSourceKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
    },
  })
}

export function useDeleteExternalSource(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteSourceAction(id)),
    // iter1463 (mode-F): External Source 削除後 ~200-500ms 待ちで card が残って
    // 見える flicker (useDeleteWorkflow iter1442 と同 root cause、ExternalSource 版)。
    onMutate: (id: string) => {
      void qc.cancelQueries({ queryKey: externalSourceKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(externalSourceKeys.list(workspaceId))
      if (snapshot) {
        qc.setQueryData(
          externalSourceKeys.list(workspaceId),
          snapshot.filter((s) => s.id !== id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(externalSourceKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
    },
  })
}

export function useTriggerSourcePull(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sourceId: string) => unwrap(await triggerSourcePullAction(sourceId)),
    onSuccess: (_, sourceId) => {
      // pull 後 item が増えるので items list / imports 履歴も invalidate
      qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
      qc.invalidateQueries({ queryKey: externalSourceKeys.imports(sourceId) })
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
