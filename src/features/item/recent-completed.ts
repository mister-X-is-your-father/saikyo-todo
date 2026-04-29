/**
 * iter359 ai-automation: 直近 N 時間に完了した item の title リストを抽出する
 * pure helper。
 *
 * iter302 velocity (件数のみ) と相補で、「具体的に何が完了したか」を AI 朝 brief /
 * pm-agent / dashboard widget が 1 関数で取り出せる substrate。「今日の達成: タスク
 * A / タスク B / タスク C」のような褒める文言や、retroactive な"今日の wins" 表示に
 * 使える。
 *
 * 仕様:
 *   - input: items 配列 ({id?, title?, priority, isMust, doneAt} の structural subset)
 *   - 集計対象: doneAt が `now - windowHours` 以降 (default 24h)
 *   - 並び: doneAt 降順 (= 新しい順)、tie で priority 昇順 (= 高優先優先)
 *   - 結果: `RecentCompletedEntry[]` (各 entry に正規化した priority + label)
 *   - limit option で上位 N 件のみ返す (default 制限なし)
 */

import { parseDateOrNull } from '@/lib/date/iso'
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'

import { formatPriorityBuckets, normalizePriority, type PriorityKey } from './priority'

export interface RecentCompletedFields {
  id?: string
  title?: string
  priority: number | null | undefined
  isMust?: boolean | null | undefined
  doneAt: Date | string | null | undefined
}

export interface RecentCompletedEntry<T extends RecentCompletedFields> {
  item: T
  priority: PriorityKey
  /** doneAt の Date instance (parse 済) */
  doneAt: Date
}

export interface ComputeRecentCompletedOptions {
  /** 集計対象時間 (時間単位)。default 24 */
  windowHours?: number
  /** 上位 N 件のみ返す。default 制限なし */
  limit?: number
}

const HOUR_MS = 60 * 60 * 1000

export function selectRecentCompleted<T extends RecentCompletedFields>(
  items: readonly T[],
  options: ComputeRecentCompletedOptions = {},
  now: Date = new Date(),
): RecentCompletedEntry<T>[] {
  const windowHours = options.windowHours ?? 24
  if (windowHours <= 0) return []
  const nowParsed = parseDateOrNull(now)
  if (!nowParsed) return []
  const cutoffMs = nowParsed.getTime() - windowHours * HOUR_MS

  const matched: RecentCompletedEntry<T>[] = []
  for (const it of items) {
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    if (done.getTime() < cutoffMs) continue
    if (done.getTime() > nowParsed.getTime()) continue // 未来 doneAt 除外
    matched.push({ item: it, priority: normalizePriority(it.priority), doneAt: done })
  }

  matched.sort((a, b) => {
    const td = b.doneAt.getTime() - a.doneAt.getTime()
    if (td !== 0) return td
    return a.priority - b.priority
  })

  if (options.limit !== undefined && options.limit >= 0) {
    return matched.slice(0, options.limit)
  }
  return matched
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'今日の達成: 3 件 — タスクA / タスクB / タスクC'`
 *   `'今日の達成: 5 件 — タスクA / タスクB / タスクC / 他 2 件'` (limit=3 時)
 *   `'今日の達成 0 件'` (空)
 *
 * `entries` は `selectRecentCompleted` の結果をそのまま渡す想定。`limit` は
 * 表示する title 上位件数、残りは "他 N 件" でまとめる。
 */
export function formatRecentCompletedSummaryJa<T extends RecentCompletedFields>(
  entries: readonly RecentCompletedEntry<T>[],
  totalCount: number = entries.length,
  limit: number = 3,
): string {
  if (totalCount === 0) return '今日の達成 0 件'
  const body = formatTopWithOverflow(entries, (e) => titleOrUntitled(e.item.title), limit, {
    totalForOverflow: totalCount,
  })
  return `今日の達成: ${totalCount} 件 — ${body}`
}

/**
 * iter434 ai-automation: recent-completed entries を priority 別 stat にバケット
 * 化する pure helper。
 *
 * iter386 (must-overdue) / iter391 (must-stuck-wip) / iter406 (must-stale) /
 * iter408 (slip-days) / iter414 (blocked-items) / iter429 (at-risk-parents) /
 * iter432 (parent-items-progress) と並ぶ「× priority」軸 — recent-completed 軸版
 * (8 弾目)。dashboard chip の aria-label / title (= SR / hover 経路) で「priority
 * breakdown」を出すための substrate (= 次 iter で basics として bind 予定)。
 *
 * 仕様:
 *  - 入力: `selectRecentCompleted` の出力 + `now` (default = new Date())
 *  - 各 bucket の `count` (= 該当完了 item 数) と `latestMinutesAgo`
 *    (= bucket 内最新完了からの経過分、count=0 なら null、Math.floor 整数)
 *  - 全 priority 0 件 / count=0 でも全 4 bucket は必ず初期化 (undefined チェック不要)
 *  - 未来 doneAt (時計ズレ等) は selectRecentCompleted で既に除外済前提だが、defensive に
 *    diffMs < 0 を 0 へ clamp
 */
export interface RecentCompletedPriorityStats {
  count: number
  /** bucket 内最新完了からの経過分 (Math.floor 整数、count=0 なら null) */
  latestMinutesAgo: number | null
}

export type RecentCompletedByPriority = Record<PriorityKey, RecentCompletedPriorityStats>

const MINUTE_MS = 60 * 1000

export function computeRecentCompletedByPriority<T extends RecentCompletedFields>(
  entries: readonly RecentCompletedEntry<T>[],
  now: Date = new Date(),
): RecentCompletedByPriority {
  const result: RecentCompletedByPriority = {
    1: { count: 0, latestMinutesAgo: null },
    2: { count: 0, latestMinutesAgo: null },
    3: { count: 0, latestMinutesAgo: null },
    4: { count: 0, latestMinutesAgo: null },
  }
  const nowMs = now.getTime()
  for (const e of entries) {
    const bucket = result[e.priority]
    bucket.count += 1
    const diffMs = Math.max(0, nowMs - e.doneAt.getTime())
    const minutesAgo = Math.floor(diffMs / MINUTE_MS)
    if (bucket.latestMinutesAgo === null || minutesAgo < bucket.latestMinutesAgo) {
      bucket.latestMinutesAgo = minutesAgo
    }
  }
  return result
}

/**
 * `latestMinutesAgo` を「3分前 / 1時間前 / 5時間前」形式に整形 (24h 内の表記)。
 * 60 分未満 → 分、60 分以上 → 時間 (Math.floor で整数化)。
 */
function formatLatestRelative(minutes: number): string {
  if (minutes < 60) return `${minutes}分前`
  return `${Math.floor(minutes / 60)}時間前`
}

/**
 * AI prompt / dashboard chip aria-label 用 priority 別 1 行サマリ:
 *   '今日の達成: P1 2 件 (最新 3分前) / P3 1 件 (最新 1時間前)'
 *
 * count=0 bucket は省略、全 0 → '今日の達成 0 件'。iter386/408/414/429/432 と同じ
 * '{label}: P1 ... / P3 ...' 形式。
 */
export function formatRecentCompletedByPriorityJa(byPriority: RecentCompletedByPriority): string {
  const body = formatPriorityBuckets(
    byPriority,
    (k, s) =>
      s.count === 0 || s.latestMinutesAgo === null
        ? null
        : `P${k} ${s.count} 件 (最新 ${formatLatestRelative(s.latestMinutesAgo)})`,
    '今日の達成 0 件',
  )
  return body === '今日の達成 0 件' ? body : `今日の達成: ${body}`
}
