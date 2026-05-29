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
    // iter1478 (mode-F、Add 系): TagPicker で「+ 新規」 で新 tag 作成後 ~200-500ms
    // 待ちで tag が候補一覧に現れない flicker (useCreateSchedule iter1477 と
    // 同 root cause、Tag 版)。temp id で仮 tag append、name 重複 guard 付き。
    onMutate: (input: CreateTagInput) => {
      void qc.cancelQueries({ queryKey: tagKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string; name: string }>>(
        tagKeys.list(workspaceId),
      )
      if (snapshot && !snapshot.some((t) => t.name === input.name)) {
        const tempEntry = {
          id: `temp-${crypto.randomUUID()}`,
          workspaceId: input.workspaceId,
          name: input.name,
          color: input.color ?? '#64748b',
          kind: 'normal' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 0,
          deletedAt: null,
        }
        qc.setQueryData(tagKeys.list(workspaceId), [...snapshot, tempEntry])
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}

export function useUpdateTag(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTagInput) => unwrap(await updateTagAction(input)),
    // iter1469 (mode-F): Tag rename / 色変更後 ~200-500ms 待ちで TagPicker / item 上 chip
    // が更新前のまま見える flicker (useUpdateGoal iter1450 / useUpdateProposal iter1449 と
    // 同 root cause、Tag 編集版)。
    onMutate: (input: UpdateTagInput) => {
      void qc.cancelQueries({ queryKey: tagKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        tagKeys.list(workspaceId),
      )
      if (snapshot) {
        qc.setQueryData(
          tagKeys.list(workspaceId),
          snapshot.map((t) => (t.id === input.id ? { ...t, ...input.patch } : t)),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}

export function useDeleteTag(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeleteTagInput) => unwrap(await deleteTagAction(input)),
    // iter1469 (mode-F): Tag 削除後 ~200-500ms 待ちで TagPicker 上 tag が残って見える
    // flicker (useDeleteWorkflow iter1442 と同 root cause、Tag 版)。
    onMutate: (input: DeleteTagInput) => {
      void qc.cancelQueries({ queryKey: tagKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(tagKeys.list(workspaceId))
      if (snapshot) {
        qc.setQueryData(
          tagKeys.list(workspaceId),
          snapshot.filter((t) => t.id !== input.id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: tagKeys.list(workspaceId) })
    },
  })
}
