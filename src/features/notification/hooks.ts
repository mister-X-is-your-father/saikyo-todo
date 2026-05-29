'use client'

/**
 * Notification 通知ベル用 TanStack Query hooks。
 *
 * - `useNotifications` は dropdown を開いた時のみ enabled (`enabled` フラグで制御)
 * - `useUnreadNotificationCount` は常時 polling 不要 (Realtime で invalidate される)
 *   - Realtime 失敗時のフォールバックで refetchInterval は持たせない方針
 *     (`useNotificationsRealtime` を必ず併用する)
 * - mutation 後は count + list を invalidate
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { unwrap } from '@/lib/result-unwrap'

import {
  getNotificationPreferencesAction,
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  unreadNotificationCountAction,
  updateNotificationPreferencesAction,
} from './actions'
import type { NotificationPreferenceUpdate } from './repository'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (workspaceId: string, opts: { unreadOnly?: boolean } = {}) =>
    [...notificationKeys.all, 'list', workspaceId, opts] as const,
  unreadCount: (workspaceId: string) =>
    [...notificationKeys.all, 'unreadCount', workspaceId] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
}

/**
 * 未読件数。`initialData` が渡されたら staleTime: Infinity + 自動 polling 無し
 * (Realtime invalidation でのみ refetch)。dev mode で Server Action の
 * router.refresh が他 mutation flow と競合する問題を避けるため。
 */
export function useUnreadNotificationCount(
  workspaceId: string,
  options: { initialData?: number } = {},
) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(workspaceId),
    queryFn: async () => unwrap(await unreadNotificationCountAction(workspaceId)),
    enabled: Boolean(workspaceId),
    initialData: options.initialData,
    staleTime: options.initialData !== undefined ? Infinity : 30_000,
    refetchOnMount: options.initialData === undefined,
    refetchOnWindowFocus: false,
  })
}

export function useNotifications(
  workspaceId: string,
  options: { unreadOnly?: boolean; enabled?: boolean } = {},
) {
  const { unreadOnly = false, enabled = true } = options
  return useQuery({
    queryKey: notificationKeys.list(workspaceId, { unreadOnly }),
    queryFn: async () => unwrap(await listNotificationsAction(workspaceId, { unreadOnly })),
    enabled: enabled && Boolean(workspaceId),
  })
}

export function useMarkNotificationRead(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) =>
      unwrap(await markNotificationReadAction(notificationId)),
    // iter1466 (mode-F): NotificationBell で 1 件既読 click 後 ~200-500ms 待ちで
    // visible が「未読」のままで unread count badge も減らない flicker
    // (useToggleCompleteItem iter1013 と同 root cause、notification 既読版)。
    // fire-and-forget cancelQueries + sync setQueryData で readAt を即セット +
    // unreadCount を 1 減算。
    onMutate: (notificationId: string) => {
      void qc.cancelQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
      void qc.cancelQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      const listSnapshots = qc.getQueriesData<Array<{ id: string; readAt: Date | null }>>({
        queryKey: [...notificationKeys.all, 'list', workspaceId],
      })
      const countSnapshot = qc.getQueryData<number>(notificationKeys.unreadCount(workspaceId))
      const now = new Date()
      let changed = false
      for (const [key, prev] of listSnapshots) {
        if (!prev) continue
        const target = prev.find((n) => n.id === notificationId)
        if (target && target.readAt === null) {
          changed = true
        }
        qc.setQueryData(
          key,
          prev.map((n) =>
            n.id === notificationId && n.readAt === null ? { ...n, readAt: now } : n,
          ),
        )
      }
      if (countSnapshot !== undefined && changed && countSnapshot > 0) {
        qc.setQueryData(notificationKeys.unreadCount(workspaceId), countSnapshot - 1)
      }
      return { listSnapshots, countSnapshot }
    },
    onError: (_e, _id, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.listSnapshots) qc.setQueryData(key as readonly unknown[], prev)
      if (ctx.countSnapshot !== undefined)
        qc.setQueryData(notificationKeys.unreadCount(workspaceId), ctx.countSnapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      void qc.invalidateQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
    },
  })
}

export function useMarkAllNotificationsRead(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrap(await markAllNotificationsReadAction(workspaceId)),
    // iter1467 (mode-F): NotificationBell の「全て既読」 button click 後 ~200-500ms
    // 待ちで list 全 row の visible が「未読」のままで unread count badge も 0 に
    // ならない flicker (useMarkNotificationRead iter1466 と同 root cause、一括版)。
    // fire-and-forget cancelQueries + sync setQueryData で全 row の readAt を
    // new Date() にセット、unreadCount を 0 にリセット。
    onMutate: () => {
      void qc.cancelQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
      void qc.cancelQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      const listSnapshots = qc.getQueriesData<Array<{ id: string; readAt: Date | null }>>({
        queryKey: [...notificationKeys.all, 'list', workspaceId],
      })
      const countSnapshot = qc.getQueryData<number>(notificationKeys.unreadCount(workspaceId))
      const now = new Date()
      for (const [key, prev] of listSnapshots) {
        if (!prev) continue
        qc.setQueryData(
          key,
          prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n)),
        )
      }
      qc.setQueryData(notificationKeys.unreadCount(workspaceId), 0)
      return { listSnapshots, countSnapshot }
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return
      for (const [key, prev] of ctx.listSnapshots) qc.setQueryData(key as readonly unknown[], prev)
      if (ctx.countSnapshot !== undefined)
        qc.setQueryData(notificationKeys.unreadCount(workspaceId), ctx.countSnapshot)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      void qc.invalidateQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
    },
  })
}

/**
 * 自分の通知設定 (email チャネル ON/OFF) を取得。
 * 行が無いユーザは default 値が埋まって返る (Server 側で default 解決済)。
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => unwrap(await getNotificationPreferencesAction()),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * 通知設定を 1 フィールド以上 patch 更新。
 * onSuccess で preferences cache を invalidate。
 */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: NotificationPreferenceUpdate) =>
      unwrap(await updateNotificationPreferencesAction(patch)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}
