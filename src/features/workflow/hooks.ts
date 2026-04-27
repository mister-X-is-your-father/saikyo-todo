'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  createWorkflowAction,
  deleteWorkflowAction,
  listWorkflowNodeRunsAction,
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
  nodeRuns: (runId: string) => [...workflowKeys.all, 'nodeRuns', runId] as const,
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

/**
 * Phase 6.15 iter137: 1 run の node_runs 詳細 (各 node の input/output/error/duration)。
 * disclosure 開閉に応じて enabled を切替えて使う。
 */
export function useWorkflowNodeRuns(runId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: workflowKeys.nodeRuns(runId),
    queryFn: async () => unwrap(await listWorkflowNodeRunsAction(runId)),
    enabled: opts.enabled !== false && Boolean(runId),
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
