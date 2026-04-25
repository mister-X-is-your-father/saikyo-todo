'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { itemKeys } from '@/features/item/hooks'

import {
  assignItemToSprintAction,
  changeSprintStatusAction,
  createSprintAction,
  getActiveSprintAction,
  listSprintsAction,
  sprintProgressAction,
  updateSprintAction,
} from './actions'
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
    onSuccess: () => invalidateSprintScope(qc, workspaceId),
  })
}

export function useChangeSprintStatus(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChangeSprintStatusInput) =>
      unwrap(await changeSprintStatusAction(input)),
    onSuccess: () => invalidateSprintScope(qc, workspaceId),
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
