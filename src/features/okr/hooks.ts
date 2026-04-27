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
    onSuccess: () => invalidateGoalScope(qc, workspaceId),
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
    onSuccess: () => {
      invalidateKrScope(qc, goalId)
      invalidateGoalScope(qc, workspaceId)
    },
  })
}

export function useDeleteKeyResult(goalId: string, workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteKeyResultAction(id)),
    onSuccess: () => {
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
    onSuccess: () => {
      invalidateGoalScope(qc, workspaceId)
      void qc.invalidateQueries({ queryKey: okrKeys.all })
      void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
    },
  })
}
