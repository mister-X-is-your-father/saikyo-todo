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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
    },
  })
}

export function useUpdateExternalSource(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateSourceInput) => unwrap(await updateSourceAction(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
    },
  })
}

export function useDeleteExternalSource(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteSourceAction(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalSourceKeys.list(workspaceId) })
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
