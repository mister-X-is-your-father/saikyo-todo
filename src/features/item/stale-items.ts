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
  const todayDate = toDate(today)
  if (!todayDate) return []

  const enriched: { entry: StaleItemEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.doneAt || it.archivedAt) continue
    if (excludeStatuses.includes(it.status)) continue
    const updatedAt = toDate(it.updatedAt)
    if (!updatedAt) continue
    const diffMs = todayDate.getTime() - updatedAt.getTime()
    if (diffMs < 0) continue // 未来更新 (時計ズレ等) は除外
    const staleDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
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
  const parts = entries.map((e) => {
    const title = e.item.title ?? '(無題)'
    return `${title} (${e.staleDays} 日前)`
  })
  return `stale ${entries.length}: ${parts.join(' / ')}`
}

function toDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : null
  // ISO 'YYYY-MM-DD' / RFC3339 datetime のどちらも Date constructor で解釈可能
  const d = new Date(input)
  return Number.isFinite(d.getTime()) ? d : null
}
