'use client'

/**
 * agent_invocations の Realtime 購読: target_item_id で絞った最新の running invocation の
 * `output.streamingText` を逐次 UI に流す。AI 分解 / 調査の "考えてる中身" を live で見せるのに使う。
 *
 * - 1 ws / 1 user は同時に 1 件しか走っていない想定 (decompose mutation の isPending と並行)
 * - subscribe 前に `realtime.setAuth` を呼んで JWT を載せる必要 (§5.18)
 * - INSERT / UPDATE どちらも拾う。row が status='completed' になったら streaming 終了
 *
 * State は TanStack Query キャッシュに置く (set-state-in-effect 回避)。
 */
import { useEffect } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface RealtimePayload {
  new?: {
    id: string
    target_item_id: string | null
    status: string
    output: { streamingText?: string } | null
  } | null
  old?: unknown
}

export interface AgentInvocationProgress {
  invocationId: string | null
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | null
  streamingText: string
}

const EMPTY_PROGRESS: AgentInvocationProgress = {
  invocationId: null,
  status: null,
  streamingText: '',
}

export const agentProgressKeys = {
  byTarget: (targetItemId: string) => ['agent-progress', targetItemId] as const,
}

/**
 * 指定 target_item_id (= 分解対象の親 Item) に紐づく最新 invocation の streaming 状態を返す。
 * Realtime 経由で invocation が完了 / 別 target に切り替わると、自然にキャッシュが上書きされる。
 */
export function useAgentInvocationProgressByTarget(
  targetItemId: string | null | undefined,
): AgentInvocationProgress {
  const qc = useQueryClient()
  const queryKey = agentProgressKeys.byTarget(targetItemId ?? '')

  const query = useQuery<AgentInvocationProgress>({
    queryKey,
    queryFn: () => EMPTY_PROGRESS,
    enabled: !!targetItemId,
    staleTime: Infinity,
    initialData: EMPTY_PROGRESS,
  })

  useEffect(() => {
    if (!targetItemId) return
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    void (async () => {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) supabase.realtime.setAuth(token)
      if (cancelled) return

      channel = supabase.channel(`agent-invocations:${targetItemId}`).on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'agent_invocations',
          filter: `target_item_id=eq.${targetItemId}`,
        } as never,
        (payload: RealtimePayload) => {
          const row = payload.new
          if (!row) return
          qc.setQueryData<AgentInvocationProgress>(queryKey, {
            invocationId: row.id,
            status: row.status as AgentInvocationProgress['status'],
            streamingText: row.output?.streamingText ?? '',
          })
        },
      )
      channel.subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
    // queryKey は targetItemId 由来なので targetItemId だけ deps に
  }, [targetItemId, qc, queryKey])

  return query.data ?? EMPTY_PROGRESS
}
