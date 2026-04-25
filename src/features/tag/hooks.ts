'use client'

/**
 * Tag の TanStack Query hooks。
 * list は workspace 単位で cache、mutation 成功時に invalidate。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { createTagAction, deleteTagAction, listTagsAction, updateTagAction } from './actions'
import type { CreateTagInput, DeleteTagInput, UpdateTagInput } from './schema'

export const tagKeys = {
  all: ['tags'] as const,
  list: (workspaceId: string) => [...tagKeys.all, workspaceId] as const,
}

export function useTags(workspaceId: string) {
  return useQuery({
    queryKey: tagKeys.list(workspaceId),
    queryFn: async () => unwrap(await listTagsAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateTag(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTagInput) => unwrap(await createTagAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}

export function useUpdateTag(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTagInput) => unwrap(await updateTagAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}

export function useDeleteTag(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeleteTagInput) => unwrap(await deleteTagAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}
