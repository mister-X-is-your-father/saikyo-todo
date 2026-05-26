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

/**
 * iter491 basics: notification 量 4 状態 hint シリーズ 10 弾目 (= velocity / blocked-items /
 * at-risk-parents / weekly-insight / inbox-process と同 FourStateHint 系列)。
 *
 * - 'idle'     : 全 0 件 (= 通知なし)
 * - 'severe'   : sync-failure >= 1 件 (= 同期失敗、即対応) OR 合計 >= 50 (= flood)
 * - 'moderate' : 合計 >= 20 OR mention >= 5 (= 多数 mention 待ち応答)
 * - 'mild'     : それ以外 (= 通常範囲)
 *
 * 用途: notification-bell badge tone / dashboard chip / Slack daily digest 見出し。
 */
import { type FourStateHint, makeHintLabelFormatter } from '@/lib/hint'

export type NotificationActivityHint = FourStateHint

export function classifyNotificationActivityHint(
  counts: Readonly<NotificationCountByType>,
): NotificationActivityHint {
  const total =
    counts.heartbeat + counts.mention + counts.invite + counts['sync-failure'] + counts.unknown
  if (total === 0) return 'idle'
  if (counts['sync-failure'] >= 1 || total >= 50) return 'severe'
  if (total >= 20 || counts.mention >= 5) return 'moderate'
  return 'mild'
}

const NOTIFICATION_HINT_LABEL_JA: Record<NotificationActivityHint, string> = {
  idle: '通知なし',
  mild: '通常',
  moderate: '多め',
  severe: '異常',
}

export const formatNotificationActivityHintJa = makeHintLabelFormatter(
  classifyNotificationActivityHint,
  NOTIFICATION_HINT_LABEL_JA,
)

/**
 * iter1009 ai-automation: 最多 type を持つ notification 軸を抽出 (= 「今日の通知は主に何系?」)。
 *
 * iter506 `pickTopActor` (audit-activity) と並ぶ「単一 最重 抽出」 pattern の notification
 * 軸版。groupNotificationsByType の output (= NotificationCountByType) を input にして、
 * 最多 count の type を返す。
 *
 * 仕様:
 *   - 全 count 0 → null
 *   - 複数 type が同値 max → NOTIFICATION_TYPE_KEYS の宣言順で先頭 (deterministic、
 *     heartbeat > mention > invite > sync-failure > unknown)
 *   - 用途: dashboard chip 「主軸: メンション (12 件)」、Slack 通知の見出し
 */
export function pickDominantNotificationType(
  counts: Readonly<NotificationCountByType>,
): { type: NotificationTypeKey; count: number } | null {
  let best: { type: NotificationTypeKey; count: number } | null = null
  for (const k of NOTIFICATION_TYPE_KEYS) {
    const c = counts[k]
    if (c > 0 && (best === null || c > best.count)) {
      best = { type: k, count: c }
    }
  }
  return best
}

/**
 * iter1009 ai-automation: pickDominantNotificationType の出力を chip 文言に整形。
 *   '通知の主軸: メンション (12 件)'  (= 全 type が non-zero の中で最多)
 *   '通知の主軸: なし'                 (= picked null = 全 count 0)
 *
 * caller (= notification-bell aria-label / dashboard chip / Slack daily digest) は本
 * 文字列をそのまま埋め込む。type label は `notificationTypeLabel` 経由 (= 既存 ja-JP
 * vocabulary と完全一致)。
 */
export function formatDominantNotificationTypeJa(
  picked: { type: NotificationTypeKey; count: number } | null,
): string {
  if (picked === null) return '通知の主軸: なし'
  return `通知の主軸: ${notificationTypeLabel(picked.type)} (${picked.count} 件)`
}

/**
 * iter1385 ai-automation: 「ユーザの応答/対応が要る」 通知だけを合算する (= 対人 + エラー系)。
 *
 * notification-bell / dashboard で「放置すると困る通知」 を heartbeat (= 自分の MUST nudge、
 * 通知自体への返信は不要) と区別して優先表示するための pure 集計。
 *
 * actionable = mention (誰かが @言及 → 応答) + invite (招待 → 受諾/辞退) +
 *              sync-failure (同期失敗 → 復旧対応)。
 * heartbeat (= MUST リマインダー、対応先は item 側) / unknown は除外。
 *
 * `formatNotificationActivitySummary` が全 type の内訳を出すのに対し、本 helper は
 * 「いま何件が自分の action 待ちか」 の 1 数値を返す (= 作業漏れ防止の優先 badge)。
 */
export function countActionableNotifications(counts: Readonly<NotificationCountByType>): number {
  return counts.mention + counts.invite + counts['sync-failure']
}
