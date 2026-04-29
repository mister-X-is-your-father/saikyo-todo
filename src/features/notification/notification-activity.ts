/**
 * iter322 ai-automation: notifications を type 別に集計する pure helper。
 *
 * iter309 並走 `comment-activity.ts` (item 別) / iter307 並走 `category-summary.ts`
 * (5 カテゴリ別) と同 shape の「分布集計」第 3 軸 — **notification type 別**。
 *
 * AI 朝 brief / dashboard widget が「未読通知: 期限近接 3 / メンション 2 / 招待 1」を
 * 1 関数で取れる substrate。今までは notification-bell.tsx が render 時に inline
 * 集計するか、bell の中で各 type を逐次描画していた。
 *
 * 入力: `Notification` の structural subset (`type` / `readAt` / `createdAt`)。
 *
 * 仕様:
 *   - 既知 4 type (heartbeat / mention / invite / sync-failure) + unknown bucket = 5 種
 *   - `onlyUnread=true` で readAt!=null の notification を除外 (default false)
 *   - `since` 指定で createdAt >= since の notification のみ集計、不正 createdAt は
 *     since 指定時のみ除外 (default 全件)
 *
 * 不正 createdAt (NaN/null/空文字) は since 不指定なら集計に含める (件数だけは
 * 取る、stale な entry でも見落とさない)。type 未知は 'unknown' bucket。
 */

import { parseDateOrNull } from '@/lib/date/iso'
import { formatNonZeroCounts } from '@/lib/format-counts'

export const NOTIFICATION_TYPE_KEYS = [
  'heartbeat',
  'mention',
  'invite',
  'sync-failure',
  'unknown',
] as const
export type NotificationTypeKey = (typeof NOTIFICATION_TYPE_KEYS)[number]

/** notification-bell の row label / sr-only と同 vocabulary。 */
const NOTIFICATION_TYPE_LABEL: Record<NotificationTypeKey, string> = {
  heartbeat: '期限近接',
  mention: 'メンション',
  invite: '招待',
  'sync-failure': '同期失敗',
  unknown: 'その他',
}

const KEY_SET: ReadonlySet<string> = new Set(NOTIFICATION_TYPE_KEYS)

export interface NotificationActivityEntry {
  type: string
  readAt: Date | string | null
  createdAt: Date | string | null
}

export interface NotificationActivityOptions {
  /** readAt!=null の notification を除外 (default false) */
  onlyUnread?: boolean
  /** Date or ISO string。createdAt >= since のみ集計 */
  since?: Date | string
}

export type NotificationCountByType = Record<NotificationTypeKey, number>

function emptyCounts(): NotificationCountByType {
  return { heartbeat: 0, mention: 0, invite: 0, 'sync-failure': 0, unknown: 0 }
}

export function notificationTypeLabel(type: NotificationTypeKey): string {
  return NOTIFICATION_TYPE_LABEL[type]
}

export function groupNotificationsByType(
  notifications: readonly NotificationActivityEntry[],
  options: NotificationActivityOptions = {},
): NotificationCountByType {
  const result = emptyCounts()
  const since = options.since ? parseDateOrNull(options.since) : null
  const onlyUnread = options.onlyUnread === true
  for (const n of notifications) {
    if (onlyUnread && n.readAt) continue
    if (since) {
      const created = parseDateOrNull(n.createdAt)
      if (!created) continue
      if (created.getTime() < since.getTime()) continue
    }
    const key: NotificationTypeKey = KEY_SET.has(n.type)
      ? (n.type as NotificationTypeKey)
      : 'unknown'
    result[key] += 1
  }
  return result
}

/**
 * `期限近接 3 / メンション 2 / 招待 1 / その他 0` 形式 (0 件 bucket は省略、全 0
 * → '0 件')。`emptySentinel` で sentinel 文字列を override 可能。
 */
export function formatNotificationActivitySummary(
  counts: Readonly<NotificationCountByType>,
  emptySentinel?: string,
): string {
  return formatNonZeroCounts(counts, NOTIFICATION_TYPE_KEYS, NOTIFICATION_TYPE_LABEL, emptySentinel)
}
