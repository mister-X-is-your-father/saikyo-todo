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

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notification/hooks'
import { useNotificationsRealtime } from '@/features/notification/realtime'
import type {
  HeartbeatPayload,
  InvitePayload,
  MentionPayload,
  Notification,
  SyncFailurePayload,
} from '@/features/notification/schema'

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
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
              data-testid="notification-bell-badge"
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
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            全て既読
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground p-4 text-center text-xs">読み込み中…</div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-xs">通知はありません</div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className="hover:bg-muted/60 flex w-full items-start gap-2 px-3 py-2 text-left"
                    data-testid="notification-item"
                    aria-label={`${n.readAt ? '既読' : '未読'}通知: ${formatNotification(n)}`}
                  >
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                        n.readAt ? 'bg-transparent' : 'bg-primary'
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug">{formatNotification(n)}</p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {formatRelativeTime(n.createdAt)}
                      </p>
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

function formatNotification(n: Notification): string {
  if (n.type === 'heartbeat') {
    const p = n.payload as HeartbeatPayload
    const stageLabel: Record<HeartbeatPayload['stage'], string> = {
      '7d': '7 日後',
      '3d': '3 日後',
      '1d': '1 日後',
      overdue: '期限切れ',
    }
    const label = stageLabel[p.stage] ?? p.stage
    if (p.stage === 'overdue') {
      return `MUST Item の期限を ${Math.abs(p.daysUntilDue)} 日超過しています (${p.dueDate})`
    }
    return `MUST Item の期限が ${label} に迫っています (${p.dueDate})`
  }
  if (n.type === 'mention') {
    const p = n.payload as MentionPayload
    const preview = (p.preview ?? '').slice(0, 40)
    const ellipsis = (p.preview ?? '').length > 40 ? '…' : ''
    return `${p.mentionedBy} があなたに言及しました: "${preview}${ellipsis}"`
  }
  if (n.type === 'invite') {
    const p = n.payload as InvitePayload
    return `Workspace「${p.workspaceName}」に招待されました (${p.role})`
  }
  if (n.type === 'sync-failure') {
    const p = n.payload as SyncFailurePayload
    return `${p.source} の同期に失敗: ${p.reason}`
  }
  return `${n.type}: ${JSON.stringify(n.payload)}`
}

function formatRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffMs = Date.now() - date.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'たった今'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 時間前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 日前`
  return date.toLocaleDateString('ja-JP')
}
