'use client'

/**
 * 通知ベル — workspace ヘッダ右端に置く。
 *
 * - 未読件数を Badge で表示 (0 件なら badge 非表示)
 * - クリック → Popover に最近 50 件 (新しい順) を表示
 * - 各通知の click → 既読化
 * - 「全て既読」ボタン
 * - Realtime 購読でリアルタイム更新
 *
 * 通知の種別ごとのレンダリングは `formatNotification` に集約 (将来 mention / invite 追加時にここを拡張)。
 */
import { useState } from 'react'

import { Bell, CheckCheck } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { formatNotificationBody, formatRelativeTime } from '@/features/notification/format'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notification/hooks'
import { useNotificationsRealtime } from '@/features/notification/realtime'
import type { HeartbeatPayload, MentionPayload, Notification } from '@/features/notification/schema'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  workspaceId: string
  currentUserId: string
  /**
   * SSR で取得した初期未読件数。これを `initialData` に渡し、count query は
   * staleTime: Infinity + Realtime 経由でのみ invalidate されるようにする
   * (常時 polling すると Server Action の router.refresh と他 mutation flow が
   *  競合し、QuickAdd input fill が不安定化する dev mode regression があった)。
   */
  initialUnreadCount: number
}

export function NotificationBell({ workspaceId, currentUserId, initialUnreadCount }: Props) {
  const [open, setOpen] = useState(false)
  const [, setOpenItemId] = useQueryState('item', parseAsString)

  // Realtime: notifications テーブルの INSERT/UPDATE で count + list を invalidate
  useNotificationsRealtime(workspaceId, currentUserId)

  const { data: unreadCount = initialUnreadCount } = useUnreadNotificationCount(workspaceId, {
    initialData: initialUnreadCount,
  })
  const { data: notifications = [], isLoading } = useNotifications(workspaceId, {
    enabled: open,
  })

  const markRead = useMarkNotificationRead(workspaceId)
  const markAllRead = useMarkAllNotificationsRead(workspaceId)

  /**
   * 通知 click 時の挙動:
   *   1. 未読なら既読化 (現状維持)
   *   2. 通知が item に紐づくタイプ (heartbeat / mention 等) なら ?item=<id> に書く
   *      → items-board の DeepLinkedItemDialog が拾って ItemEditDialog を開く
   *   3. popover を閉じる
   */
  function handleNotificationClick(n: Notification) {
    if (!n.readAt) markRead.mutate(n.id)
    const itemId = extractItemId(n)
    if (itemId) void setOpenItemId(itemId)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`通知 (未読 ${unreadCount} 件)`}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
              data-testid="notification-bell-badge"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">通知</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
            data-testid="notification-mark-all-read"
            aria-label={`未読 ${unreadCount} 件をすべて既読にする`}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            全て既読
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div
              className="text-muted-foreground p-4 text-center text-xs"
              role="status"
              aria-live="polite"
            >
              読み込み中…
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-xs" role="status">
              通知はありません
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className="hover:bg-muted/60 flex w-full items-start gap-2 px-3 py-2 text-left"
                    data-testid="notification-item"
                    aria-label={`${n.readAt ? '既読' : '未読'}通知: ${formatNotificationBody(n)}`}
                  >
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        n.readAt ? 'bg-transparent' : 'bg-primary'
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug">{formatNotificationBody(n)}</p>
                      <time
                        className="text-muted-foreground mt-0.5 block text-[10px]"
                        dateTime={
                          n.createdAt instanceof Date
                            ? n.createdAt.toISOString()
                            : new Date(n.createdAt).toISOString()
                        }
                      >
                        {formatRelativeTime(n.createdAt)}
                      </time>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * payload から itemId を取り出す。type が item に紐づく通知 (heartbeat / mention 等)
 * のときだけ非 null を返す。invite / sync-failure など item に紐付かない type は null。
 */
function extractItemId(n: Notification): string | null {
  if (n.type === 'heartbeat') {
    return (n.payload as HeartbeatPayload).itemId ?? null
  }
  if (n.type === 'mention') {
    return (n.payload as MentionPayload).itemId ?? null
  }
  return null
}

// Phase 6.15 iter 86: フォーマット 2 関数を `@/features/notification/format` に抽出。
// 単体テスト (format.test.ts) で各 type / 相対時刻 paths を検証。
