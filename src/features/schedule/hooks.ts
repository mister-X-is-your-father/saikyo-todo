'use client'

import { useEffect, useRef } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

import {
  createScheduleAction,
  listSchedulesByDateAction,
  moveScheduleAction,
  softDeleteScheduleAction,
  startTimerAction,
  stopTimerAction,
  updateScheduleAction,
} from './actions'
import type {
  CreateScheduleInput,
  MoveScheduleInput,
  Schedule,
  SoftDeleteScheduleInput,
  StartTimerInput,
  StopTimerInput,
  UpdateScheduleInput,
} from './schema'

export const scheduleKeys = {
  all: ['schedules'] as const,
  byDate: (workspaceId: string, date: string) =>
    [...scheduleKeys.all, workspaceId, 'date', date] as const,
}

export function useSchedulesByDate(workspaceId: string, date: string) {
  return useQuery({
    queryKey: scheduleKeys.byDate(workspaceId, date),
    queryFn: async () => unwrap(await listSchedulesByDateAction({ workspaceId, date })),
    enabled: Boolean(workspaceId && date),
  })
}

export function useCreateSchedule(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateScheduleInput) => unwrap(await createScheduleAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

export function useUpdateSchedule(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateScheduleInput) => unwrap(await updateScheduleAction(input)),
    // iter1458 (mode-F): Schedule 編集 (note / startAt / endAt / itemId) 保存後
    // ~200-500ms 待ちで visible が更新前のまま見える flicker (useMoveSchedule iter63 と
    // 同 file 楽観 update pattern の note 編集版)。fire-and-forget cancelQueries + sync
    // setQueryData で id match の schedule を input.patch で merge spread。startAt/endAt
    // は ISO string なので new Date() に変換 (Schedule 型整合)。
    onMutate: (input: UpdateScheduleInput) => {
      void qc.cancelQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
      const snapshot = qc.getQueryData<Schedule[]>(scheduleKeys.byDate(workspaceId, date))
      if (snapshot) {
        qc.setQueryData<Schedule[]>(
          scheduleKeys.byDate(workspaceId, date),
          snapshot.map((s) => {
            if (s.id !== input.id) return s
            const next: Schedule = { ...s }
            if (input.patch.itemId !== undefined) next.itemId = input.patch.itemId ?? null
            if (input.patch.startAt !== undefined) next.startAt = new Date(input.patch.startAt)
            if (input.patch.endAt !== undefined) next.endAt = new Date(input.patch.endAt)
            if (input.patch.note !== undefined) next.note = input.patch.note ?? null
            return next
          }),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(scheduleKeys.byDate(workspaceId, date), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

/**
 * 楽観更新: drag/resize は UI 即応性が肝。失敗時に rollback。
 */
export function useMoveSchedule(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: MoveScheduleInput) => unwrap(await moveScheduleAction(input)),
    onMutate: async (input) => {
      const key = scheduleKeys.byDate(workspaceId, date)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Schedule[]>(key)
      if (prev) {
        qc.setQueryData<Schedule[]>(
          key,
          prev.map((s) =>
            s.id === input.id
              ? { ...s, startAt: new Date(input.startAt), endAt: new Date(input.endAt) }
              : s,
          ),
        )
      }
      return { prev }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(scheduleKeys.byDate(workspaceId, date), ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

export function useSoftDeleteSchedule(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SoftDeleteScheduleInput) =>
      unwrap(await softDeleteScheduleAction(input)),
    // iter1444 (mode-F): Schedule (timeline/calendar の予定 block) 削除後
    // ~200-500ms 待ちで block が消えない flicker (useDeleteWorkflow iter1442 /
    // useDeleteKeyResult iter1441 / useSoftDeleteTemplate iter1443 と同 root cause)。
    // fire-and-forget cancelQueries + sync setQueryData で list cache から id match
    // で filter 除外、onError rollback、onSettled で正規 invalidate。
    onMutate: (input: SoftDeleteScheduleInput) => {
      void qc.cancelQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
      const snapshot = qc.getQueryData<Array<{ id: string }>>(
        scheduleKeys.byDate(workspaceId, date),
      )
      if (snapshot) {
        qc.setQueryData(
          scheduleKeys.byDate(workspaceId, date),
          snapshot.filter((s) => s.id !== input.id),
        )
      }
      return { snapshot }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(scheduleKeys.byDate(workspaceId, date), ctx.snapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

export function useStartTimer(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: StartTimerInput) => unwrap(await startTimerAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

export function useStopTimer(workspaceId: string, date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: StopTimerInput) => unwrap(await stopTimerAction(input)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
    },
  })
}

const INVALIDATE_DEBOUNCE_MS = 300

/**
 * Supabase Realtime: item_schedules テーブルの変更を購読し、
 * 該当 workspace の date キャッシュを invalidate する。
 * 既存 useItemsRealtime と同じ setAuth → subscribe パターン。
 */
export function useSchedulesRealtime(workspaceId: string, date: string): void {
  const qc = useQueryClient()
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    void (async () => {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) supabase.realtime.setAuth(token)
      if (cancelled) return

      channel = supabase.channel(`item_schedules:${workspaceId}:${date}`).on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'item_schedules',
          filter: `workspace_id=eq.${workspaceId}`,
        } as never,
        () => {
          if (pendingRef.current) return
          pendingRef.current = setTimeout(() => {
            pendingRef.current = null
            void qc.invalidateQueries({ queryKey: scheduleKeys.byDate(workspaceId, date) })
          }, INVALIDATE_DEBOUNCE_MS)
        },
      )
      channel.subscribe()
    })()

    return () => {
      cancelled = true
      if (pendingRef.current) {
        clearTimeout(pendingRef.current)
        pendingRef.current = null
      }
      if (channel) void supabase.removeChannel(channel)
    }
  }, [workspaceId, date, qc])
}
