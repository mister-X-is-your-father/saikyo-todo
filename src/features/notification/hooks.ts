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
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  unreadNotificationCountAction,
} from './actions'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (workspaceId: string, opts: { unreadOnly?: boolean } = {}) =>
    [...notificationKeys.all, 'list', workspaceId, opts] as const,
  unreadCount: (workspaceId: string) =>
    [...notificationKeys.all, 'unreadCount', workspaceId] as const,
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      void qc.invalidateQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
    },
  })
}

export function useMarkAllNotificationsRead(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrap(await markAllNotificationsReadAction(workspaceId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(workspaceId) })
      void qc.invalidateQueries({ queryKey: [...notificationKeys.all, 'list', workspaceId] })
    },
  })
}
