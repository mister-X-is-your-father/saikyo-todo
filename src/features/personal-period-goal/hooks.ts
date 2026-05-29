'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import { getPersonalPeriodGoalAction, upsertPersonalPeriodGoalAction } from './actions'
import type { Period, UpsertGoalInput } from './schema'

export const personalPeriodGoalKeys = {
  all: ['personal-period-goals'] as const,
  one: (workspaceId: string, period: Period, periodKey: string) =>
    [...personalPeriodGoalKeys.all, workspaceId, period, periodKey] as const,
}

export function usePersonalPeriodGoal(workspaceId: string, period: Period, periodKey: string) {
  return useQuery({
    queryKey: personalPeriodGoalKeys.one(workspaceId, period, periodKey),
    queryFn: async () =>
      unwrap(await getPersonalPeriodGoalAction({ workspaceId, period, periodKey })),
    enabled: Boolean(workspaceId && period && periodKey),
  })
}

export function useUpsertPersonalPeriodGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpsertGoalInput) =>
      unwrap(await upsertPersonalPeriodGoalAction(input)),
    // iter1460 (mode-F): Daily/Weekly/Monthly view の期間ゴール inline 編集
    // (textarea「保存」) 後 ~200-500ms 待ちで visible text が更新前のまま見える
    // flicker (useUpdateSprintDefaults iter1459 / useUpdateItem iter1453 と同
    // root cause、PersonalPeriodGoal 版)。fire-and-forget cancelQueries + sync
    // setQueryData で 1 row の text field を即書換。
    onMutate: (vars: UpsertGoalInput) => {
      const key = personalPeriodGoalKeys.one(vars.workspaceId, vars.period, vars.periodKey)
      void qc.cancelQueries({ queryKey: key })
      const snapshot = qc.getQueryData(key)
      qc.setQueryData(key, {
        ...(snapshot as Record<string, unknown> | undefined),
        text: vars.text,
      })
      return { snapshot, key }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.snapshot !== undefined) qc.setQueryData(ctx.key, ctx.snapshot)
    },
    onSettled: (_data, _e, vars) => {
      void qc.invalidateQueries({
        queryKey: personalPeriodGoalKeys.one(vars.workspaceId, vars.period, vars.periodKey),
      })
    },
  })
}
