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
    // iter1489 (mode-F、Add 系): /time-entries で TimeEntry 作成後 ~200-500ms 待ちで
    // entry が一覧に現れない flicker (useCreateSchedule iter1477 と同 root cause、
    //  TimeEntry 版)。temp id で仮 entry append。
    onMutate: (input: CreateTimeEntryInput) => {
      void qc.cancelQueries({ queryKey: timeEntryKeys.list(workspaceId) })
      const snapshot = qc.getQueryData<TimeEntry[]>(timeEntryKeys.list(workspaceId))
      if (snapshot) {
        const tempEntry = {
          id: `temp-${crypto.randomUUID()}`,
          workspaceId: input.workspaceId,
          itemId: input.itemId ?? null,
          userId: '',
          workDate: input.workDate,
          category: input.category,
          description: input.description ?? '',
          durationMinutes: input.durationMinutes,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 0,
        } as unknown as TimeEntry
        qc.setQueryData<TimeEntry[]>(timeEntryKeys.list(workspaceId), [tempEntry, ...snapshot])
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(timeEntryKeys.list(workspaceId), ctx.snapshot)
    },
    onSettled: () => {
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
