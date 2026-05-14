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
import { useMemo, useState } from 'react'

import { AlarmClock, AlertCircle, AtSign, Bell, CheckCheck, UserPlus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'

import { buildFourStateHintChip } from '@/lib/widget/severity-bridges'

import { formatNotificationBody, formatRelativeTime } from '@/features/notification/format'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/features/notification/hooks'
import {
  classifyNotificationActivityHint,
  formatNotificationActivityHintJa,
  formatNotificationActivitySummary,
  groupNotificationsByType,
} from '@/features/notification/notification-activity'
import { useNotificationsRealtime } from '@/features/notification/realtime'
import type { HeartbeatPayload, MentionPayload, Notification } from '@/features/notification/schema'
import {
  getNotificationTypeVisual,
  type NotificationIconKey,
} from '@/features/notification/type-visual'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** type-visual の iconKey から Lucide component に map (status-visual と同パターン)。 */
const TYPE_ICON: Record<NotificationIconKey, typeof Bell> = {
  alarm: AlarmClock,
  'at-sign': AtSign,
  'user-plus': UserPlus,
  'alert-circle': AlertCircle,
  bell: Bell,
}

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

  // iter323 basics: 未読 type 別 breakdown を popover header に出して
  // 「期限近接 3 / メンション 2」が一瞬で読めるように。iter322 substrate (15/15
  // PASS) を bind、unread 0 件 / 全 type 0 件は null 返しで chip 非表示。
  const unreadBreakdown = useMemo(() => {
    if (notifications.length === 0) return null
    const counts = groupNotificationsByType(notifications, { onlyUnread: true })
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    if (total === 0) return null
    return formatNotificationActivitySummary(counts)
  }, [notifications])

  // iter499 ai-automation: notification-activity hint chip (iter491 substrate +
  // iter495 bridge)。popover header に「通知 健全性」 chip を表示、配色は
  // sync-failure / flood で rose に切り替わる。
  const hint = useMemo(() => {
    if (notifications.length === 0) return null
    const counts = groupNotificationsByType(notifications, { onlyUnread: true })
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    if (total === 0) return null
    return buildFourStateHintChip(
      counts,
      classifyNotificationActivityHint,
      formatNotificationActivityHintJa,
    )
  }, [notifications])

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
          className="relative min-h-11 min-w-11"
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
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0"
        aria-labelledby="notification-bell-heading"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* SR の heading navigation で popover に到達した直後にラベルが
                聞ける (visual サイズは text-sm 維持、heading 風 styling は不要) */}
            <h2
              className="flex items-center gap-2 text-sm font-medium"
              id="notification-bell-heading"
            >
              通知
              {hint && (
                <span
                  className={`rounded border px-1.5 py-0 text-[10px] font-normal ${hint.chipClass}`}
                  data-testid="notification-bell-hint"
                  data-severity={hint.severity}
                  aria-label={`通知 健全性: ${hint.label}`}
                >
                  <span aria-hidden="true">{hint.label}</span>
                </span>
              )}
            </h2>
            {unreadBreakdown ? (
              <span
                className="text-muted-foreground truncate text-[10px]"
                data-testid="notification-bell-breakdown"
                aria-label={`未読内訳: ${unreadBreakdown}`}
                title={unreadBreakdown}
              >
                <span aria-hidden="true">{unreadBreakdown}</span>
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            disabled={unreadCount === 0 || markAllRead.isPending}
            aria-busy={markAllRead.isPending || undefined}
            onClick={() => markAllRead.mutate()}
            data-testid="notification-mark-all-read"
            aria-label={
              unreadCount === 0
                ? '未読通知がないため既読化不要'
                : markAllRead.isPending
                  ? `未読 ${unreadCount} 件を既読化中…`
                  : `未読 ${unreadCount} 件をすべて既読にする`
            }
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">全て既読</span>
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
            <div
              className="text-muted-foreground p-4 text-center text-xs"
              role="status"
              aria-live="polite"
            >
              通知はありません
            </div>
          ) : (
            <ul className="divide-y" aria-labelledby="notification-bell-heading">
              {notifications.map((n) => {
                const visual = getNotificationTypeVisual(n.type)
                const Icon = TYPE_ICON[visual.iconKey]
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="hover:bg-muted/60 focus-visible:ring-ring flex w-full items-start gap-2 rounded px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                      data-testid="notification-item"
                      data-notification-type={n.type}
                      aria-label={`${n.readAt ? '既読' : '未読'}${visual.label}通知: ${formatNotificationBody(n)}`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}
                        role="img"
                        aria-label={visual.label}
                        data-testid={`notification-type-icon-${n.type}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* iter882: body は outer button の aria-label に既に
                            formatNotificationBody(n) を含めるため SR には重複。
                            aria-hidden="true" で visible 経路のみに限定し、SR は
                            button aria-label を単独経路にする。<time> は aria-label
                            に含まれないので aria-hidden は外し SR に届ける。 */}
                        <p className="text-xs leading-snug" aria-hidden="true">
                          {!n.readAt && (
                            <span className="bg-primary mr-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle" />
                          )}
                          {formatNotificationBody(n)}
                        </p>
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
                )
              })}
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
