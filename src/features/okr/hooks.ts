'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'

import {
  assignItemToKeyResultAction,
  createGoalAction,
  createKeyResultAction,
  deleteKeyResultAction,
  goalProgressAction,
  listAllKeyResultsByWorkspaceAction,
  listGoalsAction,
  listKeyResultsAction,
  updateGoalAction,
  updateKeyResultAction,
} from './actions'
import type {
  AssignItemToKeyResultInput,
  CreateGoalInput,
  CreateKeyResultInput,
  UpdateGoalInput,
  UpdateKeyResultInput,
} from './schema'

export const okrKeys = {
  all: ['okr'] as const,
  goals: (workspaceId: string) => [...okrKeys.all, 'goals', workspaceId] as const,
  krs: (goalId: string) => [...okrKeys.all, 'krs', goalId] as const,
  krsAll: (workspaceId: string) => [...okrKeys.all, 'krs-all', workspaceId] as const,
  progress: (goalId: string) => [...okrKeys.all, 'progress', goalId] as const,
}

function invalidateGoalScope(qc: ReturnType<typeof useQueryClient>, workspaceId: string) {
  void qc.invalidateQueries({ queryKey: okrKeys.goals(workspaceId) })
}
function invalidateKrScope(qc: ReturnType<typeof useQueryClient>, goalId: string) {
  void qc.invalidateQueries({ queryKey: okrKeys.krs(goalId) })
  void qc.invalidateQueries({ queryKey: okrKeys.progress(goalId) })
}

export function useGoals(workspaceId: string) {
  return useQuery({
    queryKey: okrKeys.goals(workspaceId),
    queryFn: async () => unwrap(await listGoalsAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useKeyResults(goalId: string | null) {
  return useQuery({
    queryKey: goalId ? okrKeys.krs(goalId) : ['okr', 'krs', 'noop'],
    queryFn: async () => unwrap(await listKeyResultsAction(goalId!)),
    enabled: Boolean(goalId),
  })
}

export function useAllKeyResultsByWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: okrKeys.krsAll(workspaceId),
    queryFn: async () => unwrap(await listAllKeyResultsByWorkspaceAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useGoalProgress(goalId: string | null) {
  return useQuery({
    queryKey: goalId ? okrKeys.progress(goalId) : ['okr', 'progress', 'noop'],
    queryFn: async () => unwrap(await goalProgressAction(goalId!)),
    enabled: Boolean(goalId),
  })
}

export function useCreateGoal(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => unwrap(await createGoalAction(input)),
    onSuccess: () => invalidateGoalScope(qc, workspaceId),
  })
}

export function useUpdateGoal(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateGoalInput) => unwrap(await updateGoalAction(input)),
    // iter1450 (mode-F): Goal 編集 form 保存後 ~200-500ms 待ちで visible title /
    // description / status が更新前のまま見える flicker (useUpdateProposal iter1449 /
    // useUpdateItemStatus iter1013 と同 root cause)。fire-and-forget cancelQueries +
    // sync setQueryData で id match の goal を patch field で merge spread。
    onMutate: (input: UpdateGoalInput) => {
      void qc.cancelQueries({ queryKey: okrKeys.goals(workspaceId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        okrKeys.goals(workspaceId),
      )
      if (snapshot) {
        qc.setQueryData(
          okrKeys.goals(workspaceId),
          snapshot.map((g) => (g.id === input.id ? { ...g, ...input.patch } : g)),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(okrKeys.goals(workspaceId), ctx.snapshot)
    },
    onSettled: () => invalidateGoalScope(qc, workspaceId),
  })
}

export function useCreateKeyResult(goalId: string, workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateKeyResultInput) => unwrap(await createKeyResultAction(input)),
    onSuccess: () => {
      invalidateKrScope(qc, goalId)
      invalidateGoalScope(qc, workspaceId)
    },
  })
}

export function useUpdateKeyResult(goalId: string, workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateKeyResultInput) => unwrap(await updateKeyResultAction(input)),
    // iter1450 (mode-F): KR 編集 form 保存後 ~200-500ms 待ちで visible title /
    // weight / progressMode / target / unit が更新前のまま見える flicker
    // (useUpdateGoal 同 sweep の KR 版)。
    onMutate: (input: UpdateKeyResultInput) => {
      void qc.cancelQueries({ queryKey: okrKeys.krs(goalId) })
      const snapshot = qc.getQueryData<Array<{ id: string } & Record<string, unknown>>>(
        okrKeys.krs(goalId),
      )
      if (snapshot) {
        qc.setQueryData(
          okrKeys.krs(goalId),
          snapshot.map((k) => (k.id === input.id ? { ...k, ...input.patch } : k)),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(okrKeys.krs(goalId), ctx.snapshot)
    },
    onSettled: () => {
      invalidateKrScope(qc, goalId)
      invalidateGoalScope(qc, workspaceId)
    },
  })
}

export function useDeleteKeyResult(goalId: string, workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteKeyResultAction(id)),
    // iter1441 (mode-F): KR ✕ click 後 ~200-500ms 待ちで列が消えない flicker
    // (useReorderItem iter437 / useToggleCompleteItem iter1013 / useArchiveItem
    // iter1437 / useChangeSprintStatus iter1440 と同 root cause)。
    // fire-and-forget cancelQueries + sync setQueryData で row を即除外。
    onMutate: (id: string) => {
      void qc.cancelQueries({ queryKey: okrKeys.krs(goalId) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(okrKeys.krs(goalId))
      if (snapshot) {
        qc.setQueryData(
          okrKeys.krs(goalId),
          snapshot.filter((k) => k.id !== id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(okrKeys.krs(goalId), ctx.snapshot)
    },
    onSettled: () => {
      invalidateKrScope(qc, goalId)
      invalidateGoalScope(qc, workspaceId)
    },
  })
}

export function useAssignItemToKeyResult(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignItemToKeyResultInput) =>
      unwrap(await assignItemToKeyResultAction(input)),
    // iter1456 (mode-F): Item ↔ KR 紐付け変更後 ~200-500ms 待ちで item.keyResultId
    // が反映されない flicker (useAssignItemToSprint iter1455 と同 root cause、KR 版)。
    // fire-and-forget cancelQueries + sync setQueryData で item.keyResultId を即書換。
    onMutate: (input: AssignItemToKeyResultInput) => {
      void qc.cancelQueries({ queryKey: [...itemKeys.all, workspaceId] })
      const snapshots = qc.getQueriesData<Array<{ id: string } & Record<string, unknown>>>({
        queryKey: [...itemKeys.all, workspaceId],
      })
      for (const [key, prev] of snapshots) {
        if (!prev) continue
        qc.setQueryData(
          key,
          prev.map((it) =>
            it.id === input.itemId ? { ...it, keyResultId: input.keyResultId } : it,
          ),
        )
      }
      return { snapshots }
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key as readonly unknown[], prev)
    },
    onSettled: () => {
      invalidateGoalScope(qc, workspaceId)
      void qc.invalidateQueries({ queryKey: okrKeys.all })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}
