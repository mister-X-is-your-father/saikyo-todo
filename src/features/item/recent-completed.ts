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

import { normalizePriority, type PriorityKey } from './priority'

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
  const titles = entries
    .slice(0, limit)
    .map((e) =>
      typeof e.item.title === 'string' && e.item.title.length > 0 ? e.item.title : '(無題)',
    )
  const rest = totalCount - titles.length
  const tail = rest > 0 ? ` / 他 ${rest} 件` : ''
  return `今日の達成: ${totalCount} 件 — ${titles.join(' / ')}${tail}`
}
