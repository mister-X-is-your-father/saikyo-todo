'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { createTimeEntryAction, listTimeEntriesAction, syncTimeEntryAction } from './actions'
import type { CreateTimeEntryInput, TimeEntry } from './schema'

export const timeEntryKeys = {
  all: ['time-entries'] as const,
  list: (workspaceId: string) => [...timeEntryKeys.all, workspaceId] as const,
}

export function useTimeEntries(workspaceId: string) {
  return useQuery<TimeEntry[]>({
    queryKey: timeEntryKeys.list(workspaceId),
    queryFn: async () =>
      unwrap(await listTimeEntriesAction({ workspaceId, limit: 100 })) as TimeEntry[],
    enabled: Boolean(workspaceId),
  })
}

export function useCreateTimeEntry(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTimeEntryInput) =>
      unwrap(await createTimeEntryAction(input)) as TimeEntry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timeEntryKeys.list(workspaceId) })
    },
  })
}

export function useSyncTimeEntry(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await syncTimeEntryAction({ workspaceId, id })) as TimeEntry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timeEntryKeys.list(workspaceId) })
    },
  })
}
