'use client'

/**
 * Supabase Realtime 購読: items テーブルの INSERT / UPDATE / DELETE を監視し、
 * TanStack Query の items キャッシュを invalidate する。
 *
 * - `filter: workspace_id=eq.<wsId>` で自分の workspace だけに絞る
 * - debounce: 短時間の連続変更は 300ms ごとにまとめて invalidate
 * - cleanup で channel.unsubscribe
 *
 * 注意: Supabase Realtime は RLS を尊重するので、authenticated ロールの
 * JWT で購読する限り、workspace 非 member は購読できない。
 */
import { useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

import { itemKeys } from './hooks'

const INVALIDATE_DEBOUNCE_MS = 300

export function useItemsRealtime(workspaceId: string): void {
  const qc = useQueryClient()
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    void (async () => {
      // Realtime の RLS 評価には現在の JWT が必要 — 明示的に setAuth してから
      // subscribe しないと postgres_changes イベントが届かない
      // (Phase 4 notification 検証で発覚)
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) supabase.realtime.setAuth(token)
      if (cancelled) return

      channel = supabase.channel(`items:${workspaceId}`).on(
        // postgres_changes: INSERT / UPDATE / DELETE すべてを捕捉
        // 型は @supabase/realtime-js の内部型なので as-never で暫定対応
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `workspace_id=eq.${workspaceId}`,
        } as never,
        () => {
          // debounce: 複数行が同時に変わってもまとめて 1 回 invalidate
          if (pendingRef.current) return
          pendingRef.current = setTimeout(() => {
            pendingRef.current = null
            void qc.invalidateQueries({ queryKey: [...itemKeys.all, workspaceId] })
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
  }, [workspaceId, qc])
}
