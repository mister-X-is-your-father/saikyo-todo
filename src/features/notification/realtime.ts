'use client'

/**
 * Supabase Realtime 購読: 自分宛 (`user_id = <currentUserId>`) の通知 INSERT / UPDATE
 * を監視して、unread count + list キャッシュを invalidate する。
 *
 * - filter: `user_id=eq.<userId>` で他人宛通知は購読しない
 *   (RLS でも漏れないが帯域節約)
 * - workspace_id 別フィルタは payload で workspaceId を比較して invalidate キーを切る
 *   (1 ユーザが複数 workspace を開いたまま遷移するケースは稀なので簡略化)
 * - debounce: heartbeat scan で 10 件以上同時 INSERT もありうるので 200ms にまとめる
 */
import { useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

import { notificationKeys } from './hooks'

const INVALIDATE_DEBOUNCE_MS = 200

export function useNotificationsRealtime(workspaceId: string, userId: string): void {
  const qc = useQueryClient()
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!workspaceId || !userId) return
    const supabase = createSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    void (async () => {
      // Realtime の RLS 評価には現在の JWT が必要。SSR cookie 由来のセッションを
      // 取り直して realtime.setAuth で明示的にセットしてから subscribe する
      // (これを省くと SUBSCRIBED 後も postgres_changes イベントが届かない)。
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) supabase.realtime.setAuth(token)
      if (cancelled) return

      channel = supabase.channel(`notifications:${userId}`).on(
        'postgres_changes' as never,
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        } as never,
        () => {
          if (pendingRef.current) return
          pendingRef.current = setTimeout(() => {
            pendingRef.current = null
            void qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
            void qc.invalidateQueries({
              queryKey: [...notificationKeys.all, 'list', workspaceId],
            })
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
  }, [workspaceId, userId, qc])
}
