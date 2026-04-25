'use client'

/**
 * Supabase Realtime 購読: 指定 parent_item_id の agent_decompose_proposals INSERT / UPDATE を
 * 監視し、pending 一覧キャッシュを invalidate する。
 *
 * これにより、Researcher が propose_child_item を 3〜5 回呼ぶ間、ユーザーは候補が
 * 1 件ずつ panel に出現するのが見える (タイプライタ効果)。
 *
 * §5.18 の通り subscribe 前に realtime.setAuth が必要。
 */
import { useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

import { proposalKeys } from './hooks'

const INVALIDATE_DEBOUNCE_MS = 150

export function useDecomposeProposalsRealtime(parentItemId: string | null | undefined): void {
  const qc = useQueryClient()
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!parentItemId) return
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    void (async () => {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) supabase.realtime.setAuth(token)
      if (cancelled) return

      channel = supabase.channel(`decompose-proposals:${parentItemId}`).on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'agent_decompose_proposals',
          filter: `parent_item_id=eq.${parentItemId}`,
        } as never,
        () => {
          if (pendingRef.current) return
          pendingRef.current = setTimeout(() => {
            pendingRef.current = null
            void qc.invalidateQueries({ queryKey: proposalKeys.pendingByParent(parentItemId) })
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
  }, [parentItemId, qc])
}
