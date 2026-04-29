/**
 * iter359 ai-automation: 進行中 (status === 'in_progress') だが一定期間 updatedAt が
 * 動いていない「stuck WIP」を抽出する pure helper。
 *
 * stale-items (iter299) が「未 done な item で updatedAt が古い」全般を対象にするのに
 * 対し、本 helper は **WIP に絞り込む**。「ユーザが意図的に着手して in_progress に
 * 移したのに、その後 N 日触られていない」= 計画上の "止まり" signal。stale-items より
 * 短い閾値 (default 3 日) で早期警告できる。wip-by-priority (iter354) は件数 / priority
 * 分布のみで age を持たないので、本 helper が age 軸を埋める。
 *
 * 仕様:
 *   - 集計対象: status === 'in_progress' && doneAt == null && archivedAt == null
 *   - updatedAt が `today - thresholdDays` より古いもののみ抽出 (default 3 日)
 *   - updatedAt が null/undefined/不正値/未来時刻 → 除外 (fail-soft)
 *   - 並び: stuckDays 降順 (= 最も停滞しているものが先頭)、tie で元配列順 stable
 *
 * caller benefits:
 *   - AI 朝 brief 「進行中だが停滞: 3 件 (タスクA 5日 / タスクB 4日)」
 *   - pm-agent watch list の「再開 nudge 候補」
 *   - dashboard widget で WIP-bias chip 隣に WIP-stuck chip
 */

import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { formatTopWithOverflow, titleOrUntitled } from '@/lib/format-list'

import {
  bucketByPriorityWith,
  formatPriorityBucketsCountWithDays,
  type PriorityKey,
} from './priority'

export interface StuckWipFields {
  id?: string
  title?: string
  status: string | null | undefined
  updatedAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
}

export interface StuckWipEntry<T extends StuckWipFields> {
  item: T
  /** updatedAt から today までの経過日数 (天井丸めでなく Math.floor) */
  stuckDays: number
}

export interface SelectStuckWipOptions {
  /** stuck と見なす updatedAt 経過日数の閾値。default 3 (= 半週間放置) */
  thresholdDays?: number
}

export function selectStuckWipItems<T extends StuckWipFields>(
  items: readonly T[],
  options: SelectStuckWipOptions = {},
  today: Date | string = new Date(),
): StuckWipEntry<T>[] {
  const thresholdDays = options.thresholdDays ?? 3
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []

  const enriched: { entry: StuckWipEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.status !== 'in_progress') continue
    if (it.doneAt || it.archivedAt) continue
    const updatedAt = parseDateOrNull(it.updatedAt)
    if (!updatedAt) continue
    const diffMs = todayDate.getTime() - updatedAt.getTime()
    if (diffMs < 0) continue
    const stuckDays = Math.floor(diffMs / MS_PER_DAY)
    if (stuckDays < thresholdDays) continue
    enriched.push({ entry: { item: it, stuckDays }, index: i })
  }
  enriched.sort((a, b) => {
    if (b.entry.stuckDays !== a.entry.stuckDays) return b.entry.stuckDays - a.entry.stuckDays
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'進行中だが停滞: 3 件 (タスクA 5 日 / タスクB 4 日 / タスクC 3 日)'`
 *   `'進行中だが停滞: 5 件 (タスクA 7 日 / タスクB 5 日 / タスクC 4 日 / 他 2 件)'` (limit=3 時)
 *   `'進行中だが停滞 0 件'` (空)
 *
 * `entries` は `selectStuckWipItems` の結果をそのまま渡す想定。`limit` は表示する
 * title 上位件数、残りは "他 N 件" でまとめる。title 欠落は `(無題)` fallback。
 */
export function formatStuckWipSummaryJa<T extends StuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
  limit: number = 3,
): string {
  if (entries.length === 0) return '進行中だが停滞 0 件'
  const body = formatTopWithOverflow(entries, renderStuckEntry, limit)
  return `進行中だが停滞: ${entries.length} 件 (${body})`
}

/**
 * iter375 refactor: stuck WIP entry を `${title} ${stuckDays} 日` に整形する render fn。
 * `formatStuckWipSummaryJa` (wip-stuck.ts) / `formatMustStuckWipJa` (must-stuck-wip.ts)
 * の 2 callsite で同 shape の inline render が重複していたので集約。title 欠落は
 * `(無題)` で fallback。
 */
export function renderStuckEntry<T extends StuckWipFields>(e: StuckWipEntry<T>): string {
  return `${titleOrUntitled(e.item.title)} ${e.stuckDays} 日`
}

/**
 * dashboard chip 配色用の severity bucket:
 *  - 'severe' (= 7 日以上 stuck な WIP が 1 件以上)
 *  - 'mild' (= stuck WIP が 1 件以上、ただし全て 7 日未満)
 *  - 'idle' (= stuck WIP 0 件)
 */
export type StuckWipSeverity = 'severe' | 'mild' | 'idle'

export function stuckWipSeverity<T extends StuckWipFields>(
  entries: readonly StuckWipEntry<T>[],
): StuckWipSeverity {
  if (entries.length === 0) return 'idle'
  if (entries.some((e) => e.stuckDays >= 7)) return 'severe'
  return 'mild'
}

/** by-priority 集計の単 bucket 値: stuck WIP 件数 + 最長 stuck 日数 (count=0 → null)。 */
export interface StuckWipByPriorityStats {
  count: number
  maxStuckDays: number | null
}

/**
 * iter362 ai-automation: stuck WIP items を priority 別に集計する pure helper。
 * iter382 hygiene-debt-by-priority / iter387 slip-days-by-priority / iter389
 * backlog-aging-by-priority / iter399 stale-urgent-by-priority と並ぶ「× priority」軸
 * 9 弾目。
 *
 * 「P1 が一番停滞、最長 7 日 / P3 が次、最長 5 日」のように 高優先軸の停滞 WIP を分離
 * して可視化、全体「進行中だが停滞 5 件」だけでは見えない priority bias を露出。
 * selectStuckWipItems の filter ロジックは bucketByPriorityWith 経由で priority 別に
 * 再適用 (P1 のみ / P2 のみ ... の各 bucket 内で stuck 抽出)。
 */
export function computeStuckWipByPriority<
  T extends StuckWipFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  options: SelectStuckWipOptions = {},
  today: Date | string = new Date(),
): Record<PriorityKey, StuckWipByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const stuck = selectStuckWipItems(group, options, today)
    if (stuck.length === 0) return { count: 0, maxStuckDays: null }
    let max = 0
    for (const e of stuck) {
      if (e.stuckDays > max) max = e.stuckDays
    }
    return { count: stuck.length, maxStuckDays: max }
  })
}

/**
 * priority 別 stuck WIP を 1 行 summary に。例:
 *   'P1 2 件 (最長 7日) / P3 1 件 (最長 5日)' / count=0 の P は省略 / 全 P 0 → '進行中だが停滞 0 件'
 */
export function formatStuckWipByPriorityJa(
  byPriority: Record<PriorityKey, StuckWipByPriorityStats>,
): string {
  return formatPriorityBucketsCountWithDays(
    byPriority,
    (s) => s.count,
    (s) => s.maxStuckDays,
    '最長',
    '進行中だが停滞 0 件',
  )
}
