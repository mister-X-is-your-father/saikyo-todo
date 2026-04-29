/**
 * iter299 ai-automation: 一定期間更新されていない (= stale な) Item を抽出する pure helper。
 *
 * AI agent (PM Agent / 朝 brief / 週次 review) が「放置されている item」を
 * 1 関数で取り出せる substrate。今までは pm-service / dashboard が独自 SQL で
 * 「updatedAt が古い items」を抽出していた → heuristic を pure 関数として固定し
 * prompt や UI で再利用可能に。
 *
 * stale 判定 (heuristic):
 *  - `doneAt == null && archivedAt == null` (未完 + 未 archive)
 *  - `status` が `excludeStatuses` (default `['done', 'cancelled']`) に含まれない
 *  - `updatedAt` が `today - thresholdDays` より古い (default 7 日)
 *  - `updatedAt` が null/undefined/未来時刻 / 不正値 → stale 判定不能、除外 (= caller
 *    側で別経路で対応する想定、本関数で誤検知しない)
 *
 * 戻り値は 古い順 (= 最も放置されている item が先頭) に並ぶ。同時刻は元配列順で stable。
 */
import { MS_PER_DAY, parseDateOrNull } from '@/lib/date/iso'
import { formatTitleDaysListJa, titleOrUntitled } from '@/lib/format-list'

import {
  bucketByPriorityWith,
  formatPriorityBucketsCountWithDays,
  type PriorityKey,
} from './priority'

/** stale 判定に必要な Item の structural subset。 */
export interface StaleItemFields {
  id?: string
  title?: string
  status: string
  updatedAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
}

const DEFAULT_EXCLUDE_STATUSES = ['done', 'cancelled'] as const

export interface StaleItemEntry<T extends StaleItemFields> {
  item: T
  /** 最終更新からの経過日数 (天井丸めで 1 日以上のみ stale 候補) */
  staleDays: number
}

export interface SelectStaleItemsOptions {
  /** stale と見なす経過日数の閾値。default 7 (= 1 週間放置で stale)。 */
  thresholdDays?: number
  /** stale 抽出から除外する status。default `['done', 'cancelled']`。 */
  excludeStatuses?: readonly string[]
}

/**
 * `today - thresholdDays` より古い updatedAt を持つ未 done / 未 archive な Item を
 * stale として抽出。経過日数 desc (= 古い順) に並ぶ。
 */
export function selectStaleItems<T extends StaleItemFields>(
  items: readonly T[],
  options: SelectStaleItemsOptions = {},
  today: Date | string = new Date(),
): StaleItemEntry<T>[] {
  const thresholdDays = options.thresholdDays ?? 7
  const excludeStatuses = options.excludeStatuses ?? DEFAULT_EXCLUDE_STATUSES
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []

  const enriched: { entry: StaleItemEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.doneAt || it.archivedAt) continue
    if (excludeStatuses.includes(it.status)) continue
    const updatedAt = parseDateOrNull(it.updatedAt)
    if (!updatedAt) continue
    const diffMs = todayDate.getTime() - updatedAt.getTime()
    if (diffMs < 0) continue // 未来更新 (時計ズレ等) は除外
    const staleDays = Math.floor(diffMs / MS_PER_DAY)
    if (staleDays < thresholdDays) continue
    enriched.push({ entry: { item: it, staleDays }, index: i })
  }
  enriched.sort((a, b) => {
    if (b.entry.staleDays !== a.entry.staleDays) return b.entry.staleDays - a.entry.staleDays
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/**
 * AI prompt 用 1 行サマリ:
 *   `stale 3: A (14 日前) / B (10 日前) / C (8 日前)`
 * 0 件は `'stale 0 (該当なし)'`。title 欠落は `'(無題)'` で fallback。
 */
export function formatStaleItemsSummary<T extends StaleItemFields>(
  entries: readonly StaleItemEntry<T>[],
): string {
  if (entries.length === 0) return 'stale 0 (該当なし)'
  const parts = entries.map((e) => `${titleOrUntitled(e.item.title)} (${e.staleDays} 日前)`)
  return `stale ${entries.length}: ${parts.join(' / ')}`
}

/** by-priority 集計の単 bucket 値: stale items 件数 + 最古日数 (count=0 → null)。 */
export interface StaleItemsByPriorityStats {
  count: number
  oldestStaleDays: number | null
}

/**
 * iter392 ai-automation: stale items を priority 別に集計する pure helper。iter369
 * (overdue-active) / iter382 (hygiene-debt) / iter384 (must-overdue) / iter389
 * (must-stuck-wip) と並ぶ「× priority」軸 12 弾目。
 *
 * 「P1 stale 3 件 (最古 14日) / P3 stale 2 件 (最古 10日)」のように、stale (= 7 日以上
 * 放置) の中でも高優先軸の偏在を可視化、全体「stale 5 件」だけでは見えない priority
 * bias を露出。AI 朝 brief や pm-agent の triage で「P1 が放置されている = 最深刻」を
 * 別軸で示せる。
 *
 * selectStaleItems の filter ロジックは bucketByPriorityWith 経由で priority 別に
 * 再適用 (P1 のみ / P2 のみ ... の各 bucket 内で stale 集計)。
 */
export function computeStaleItemsByPriority<
  T extends StaleItemFields & { priority: number | null | undefined },
>(
  items: readonly T[],
  options: SelectStaleItemsOptions = {},
  today: Date | string = new Date(),
): Record<PriorityKey, StaleItemsByPriorityStats> {
  return bucketByPriorityWith(items, (group) => {
    const entries = selectStaleItems(group, options, today)
    if (entries.length === 0) return { count: 0, oldestStaleDays: null }
    const max = entries.reduce((m, e) => (e.staleDays > m ? e.staleDays : m), 0)
    return { count: entries.length, oldestStaleDays: max }
  })
}

/**
 * priority 別 stale items を 1 行 summary に。例:
 *   'P1 3 件 (最古 14日) / P3 2 件 (最古 10日)' / count=0 P 省略 / 全 P 0 → 'stale 0 件'
 *
 * iter385 で集約した formatPriorityBucketsCountWithDays を使う 6 callsite 目。
 * label '最古' は overdue-active / must-overdue と vocabulary 統一。
 */
export function formatStaleItemsByPriorityJa(
  byPriority: Record<PriorityKey, StaleItemsByPriorityStats>,
): string {
  return formatPriorityBucketsCountWithDays(
    byPriority,
    (s) => s.count,
    (s) => s.oldestStaleDays,
    '最古',
    'stale 0 件',
  )
}

/**
 * iter409 ai-automation: stale items の "title list with overflow" formatter。iter379
 * (formatMustOverdueTitlesJa) / iter382 (formatOverdueActiveTitlesJa) / iter407
 * (formatSlipDaysTitlesJa) と同シリーズ — stale-items 軸の title list を limit + overflow
 * で整形する変種。
 *
 * `formatStaleItemsSummary` (既存) との違い:
 *   - 既存は entries 全件を `/` で連結 (overflow 制御無し)
 *   - 本 fn は limit を超えた残件を「他 N 件」で集約 (= AI brief / 通知 / dashboard
 *     tooltip で長さを抑える)
 *
 * 文言例:
 *   '古参: 提出書類 14日 / 連絡 10日 / 他 1 件'   (limit=2、entries=3 件)
 *   '古参: A 14日 / B 10日 / C 8日'              (limit=3、entries=3 件)
 *   '古参 0 件'                                    (entries=空)
 *
 * iter379/382/407 と同 vocabulary、prefix '古参' で stale 軸を表現 (= must-stale の
 * 'MUST 古参' から MUST 部分を取り除いた汎用版)。
 */
export function formatStaleItemsTitlesJa<T extends StaleItemFields>(
  entries: readonly StaleItemEntry<T>[],
  limit: number = 3,
): string {
  return formatTitleDaysListJa(entries, (e) => e.staleDays, '古参', limit)
}

// iter305 refactor: parseDateOrNull (lib/date/iso) に集約。
