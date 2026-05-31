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
          /* iter1497: iter1093-1496 em-dash sweep に合わせ () → em-dash 区切。
             icon-only button (Bell + badge は aria-hidden) なので accessible name は
             aria-label の値、voice control「click 通知」 prefix match 維持。 */
          aria-label={`通知 — 未読 ${unreadCount} 件`}
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
                // iter1050: role 無 span への aria-label は SR picked-up が不確実、
                // iter1023/1049 と同 pattern で `role="img"` を付与し authoritative 化。
                <span
                  className={`rounded border px-1.5 py-0 text-[10px] font-normal ${hint.chipClass}`}
                  data-testid="notification-bell-hint"
                  data-severity={hint.severity}
                  role="img"
                  /* iter1561: 旧 aria-label `"通知 健全性: ${hint.label}"` は visible "${label}" を末尾
                     に持ち voice control prefix-matching「click 健全」 が strict prefix-match で不可
                     (substring 一致のみ)。iter1553-1560 status/role/health Badge family と同 pattern、
                     visible 冒頭固定 + em-dash 区切。 */
                  aria-label={`${hint.label} — 通知 健全性`}
                >
                  <span aria-hidden="true">{hint.label}</span>
                </span>
              )}
            </h2>
            {unreadBreakdown ? (
              // iter1050: 同 role=img 付与で SR aria-label authoritative 化
              <span
                className="text-muted-foreground truncate text-[10px]"
                data-testid="notification-bell-breakdown"
                role="img"
                /* iter1565: 旧 `未読内訳: ${unreadBreakdown}` は ':' colon 区切で visible
                   "${unreadBreakdown}" を末尾に持ち voice control prefix-matching 不可。
                   iter1561 同 file 内 hint chip と同 pattern、visible 冒頭固定 + em-dash 区切。 */
                aria-label={`${unreadBreakdown} — 未読内訳`}
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
            // iter1043: visible "全て既読" を aria-label の prefix に固定し WCAG 2.5.3
            // satisfy (旧 aria-label は "すべて既読にする" / "未読… 既読化中" で
            // literal "全て既読" 連続 substring 無し、voice control match 不可)。
            aria-label={
              unreadCount === 0
                ? '全て既読 — 未読通知がないため既読化不要'
                : markAllRead.isPending
                  ? `全て既読 — 未読 ${unreadCount} 件を既読化中…`
                  : `全て既読 — 未読 ${unreadCount} 件をすべて既読にする`
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
                    {/* iter1200: 旧 aria-label `${'未読/既読'}${visual.label}通知: ${body}` は
                        visible body (= 唯一の visible text 内容) を末尾 position に持ち、voice control
                        prefix-matching「click <body 先頭語>」 match 不可 (substring 一致のみ)。
                        iter1093-1199 sweep convention (visible 冒頭 + em-dash 区切で descriptive) に
                        合わせ body を冒頭固定し未読/既読 / type 種別を descriptive 末尾に移動。 */}
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="hover:bg-muted/60 focus-visible:ring-ring flex w-full items-start gap-2 rounded px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                      data-testid="notification-item"
                      data-notification-type={n.type}
                      // iter1366: button が subtree を name するため内側 `<time>` の相対時刻が
                      // SR に届かなかった (視覚のみ)。受信時刻を accessible name 末尾に含め、
                      // SR ユーザにも「いつ届いたか」を伝える (WCAG 1.3.1)。
                      aria-label={`${formatNotificationBody(n)} — ${n.readAt ? '既読' : '未読'}${visual.label}通知 — ${formatRelativeTime(n.createdAt)}`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${visual.bgClass} ${visual.textClass} ${visual.ringClass}`}
                        aria-hidden="true"
                        data-testid={`notification-type-icon-${n.type}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
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
                          aria-label={`${formatRelativeTime(n.createdAt)} (${n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString()})`}
                        >
                          <span aria-hidden="true">{formatRelativeTime(n.createdAt)}</span>
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
