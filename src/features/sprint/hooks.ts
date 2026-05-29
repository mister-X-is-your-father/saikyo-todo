'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'

import {
  assignItemToSprintAction,
  changeSprintStatusAction,
  createSprintAction,
  getActiveSprintAction,
  getSprintDefaultsAction,
  listSprintsAction,
  sprintProgressAction,
  updateSprintAction,
  updateSprintDefaultsAction,
} from './actions'
import { runPremortemForSprintAction } from './premortem-actions'
import { runRetroForSprintAction } from './retro-actions'
import type {
  AssignItemToSprintInput,
  ChangeSprintStatusInput,
  CreateSprintInput,
  UpdateSprintInput,
} from './schema'

export const sprintKeys = {
  all: ['sprints'] as const,
  list: (workspaceId: string) => [...sprintKeys.all, 'list', workspaceId] as const,
  active: (workspaceId: string) => [...sprintKeys.all, 'active', workspaceId] as const,
  progress: (sprintId: string) => [...sprintKeys.all, 'progress', sprintId] as const,
  defaults: (workspaceId: string) => [...sprintKeys.all, 'defaults', workspaceId] as const,
}

/** Phase 6.15 iter 106: workspace 単位 Sprint デフォルト (基本曜日 / 期間日数) */
export function useSprintDefaults(workspaceId: string) {
  return useQuery({
    queryKey: sprintKeys.defaults(workspaceId),
    queryFn: async () => unwrap(await getSprintDefaultsAction(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
  })
}

/** Phase 6.15 iter 110: Sprint デフォルト更新 (admin 以上) */
export function useUpdateSprintDefaults(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { startDow: number; lengthDays: number }) =>
      unwrap(await updateSprintDefaultsAction({ workspaceId, ...input })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.defaults(workspaceId) })
    },
  })
}

export function useSprints(workspaceId: string) {
  return useQuery({
    queryKey: sprintKeys.list(workspaceId),
    queryFn: async () => unwrap(await listSprintsAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useActiveSprint(workspaceId: string) {
  return useQuery({
    queryKey: sprintKeys.active(workspaceId),
    queryFn: async () => unwrap(await getActiveSprintAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useSprintProgress(sprintId: string | null) {
  return useQuery({
    queryKey: sprintId ? sprintKeys.progress(sprintId) : ['sprints', 'progress', 'noop'],
    queryFn: async () => unwrap(await sprintProgressAction(sprintId!)),
    enabled: Boolean(sprintId),
  })
}

function invalidateSprintScope(qc: ReturnType<typeof useQueryClient>, workspaceId: string) {
  void qc.invalidateQueries({ queryKey: sprintKeys.list(workspaceId) })
  void qc.invalidateQueries({ queryKey: sprintKeys.active(workspaceId) })
}

export function useCreateSprint(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSprintInput) => unwrap(await createSprintAction(input)),
    onSuccess: () => invalidateSprintScope(qc, workspaceId),
  })
}

export function useUpdateSprint(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateSprintInput) => unwrap(await updateSprintAction(input)),
    // iter1454 (mode-F): Sprint 編集 form 保存後 / 期間 inline 編集後 ~200-500ms
    // 待ちで visible name / goal / startDate / endDate が更新前のまま見える flicker
    // (useUpdateItem iter1453 / useChangeSprintStatus iter1440 と同 root cause、
    //  Sprint 編集版)。fire-and-forget cancelQueries + sync setQueryData。
    onMutate: (input: UpdateSprintInput) => {
      void qc.cancelQueries({ queryKey: sprintKeys.list(workspaceId) })
      void qc.cancelQueries({ queryKey: sprintKeys.active(workspaceId) })
      const snapshots = qc.getQueriesData<Array<{ id: string } & Record<string, unknown>>>({
        queryKey: sprintKeys.all,
      })
      for (const [key, prev] of snapshots) {
        if (!Array.isArray(prev)) continue
        qc.setQueryData(
          key,
          prev.map((s) => (s.id === input.id ? { ...s, ...input.patch } : s)),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => invalidateSprintScope(qc, workspaceId),
  })
}

export function useChangeSprintStatus(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChangeSprintStatusInput) =>
      unwrap(await changeSprintStatusAction(input)),
    // iter1440 (mode-F): planning↔active↔completed の status button 切替時に
    // ~200-500ms 待つと「変えたのに反映されない」 認知が出る (useReorderItem
    // iter437 / useToggleCompleteItem iter1013 / useToggleTag iter1402 /
    // useArchiveItem iter1437 と同 root cause)。fire-and-forget cancelQueries +
    // sync setQueryData で sprint.status を即反映。
    onMutate: (input) => {
      void qc.cancelQueries({ queryKey: sprintKeys.list(workspaceId) })
      void qc.cancelQueries({ queryKey: sprintKeys.active(workspaceId) })
      const snapshots = qc.getQueriesData({ queryKey: sprintKeys.all })
      for (const [key, prev] of snapshots) {
        if (!Array.isArray(prev)) continue
        qc.setQueryData(
          key,
          prev.map((s: { id: string }) => (s.id === input.id ? { ...s, status: input.status } : s)),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => invalidateSprintScope(qc, workspaceId),
  })
}

export function useRunRetro(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sprintId: string) => unwrap(await runRetroForSprintAction(sprintId)),
    onSuccess: () => {
      // Doc / Item が増えるので関連 query を invalidate
      void qc.invalidateQueries({ queryKey: ['docs', workspaceId] })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}

export function useRunPremortem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sprintId: string) => unwrap(await runPremortemForSprintAction(sprintId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['docs', workspaceId] })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
      invalidateSprintScope(qc, workspaceId)
    },
  })
}

export function useAssignItemToSprint(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignItemToSprintInput) =>
      unwrap(await assignItemToSprintAction(input)),
    onSuccess: () => {
      invalidateSprintScope(qc, workspaceId)
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}
