'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  createWorkflowAction,
  deleteWorkflowAction,
  listWorkflowRunsAction,
  listWorkflowsAction,
  triggerWorkflowAction,
  updateWorkflowAction,
} from './actions'
import type { CreateWorkflowInput, UpdateWorkflowInput } from './schema'

export const workflowKeys = {
  all: ['workflows'] as const,
  list: (workspaceId: string) => [...workflowKeys.all, 'list', workspaceId] as const,
  runs: (workflowId: string) => [...workflowKeys.all, 'runs', workflowId] as const,
}

export function useWorkflows(workspaceId: string) {
  return useQuery({
    queryKey: workflowKeys.list(workspaceId),
    queryFn: async () => unwrap(await listWorkflowsAction(workspaceId)),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateWorkflow(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateWorkflowInput) => unwrap(await createWorkflowAction(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.list(workspaceId) })
    },
  })
}

export function useUpdateWorkflow(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateWorkflowInput) => unwrap(await updateWorkflowAction(input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.list(workspaceId) })
    },
  })
}

export function useDeleteWorkflow(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteWorkflowAction(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.list(workspaceId) })
    },
  })
}

export function useWorkflowRuns(workflowId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: workflowKeys.runs(workflowId),
    queryFn: async () => unwrap(await listWorkflowRunsAction(workflowId, 5)),
    enabled: opts.enabled !== false && Boolean(workflowId),
  })
}

export function useTriggerWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { workflowId: string; input?: unknown }) =>
      unwrap(await triggerWorkflowAction(input)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: workflowKeys.runs(vars.workflowId) })
    },
  })
}
