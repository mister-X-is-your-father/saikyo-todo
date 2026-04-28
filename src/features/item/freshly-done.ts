/**
 * iter302 ai-automation: 最近 (= 直近 N 日) 完了した Item を抽出する pure helper。
 *
 * iter299 (`selectStaleItems` 放置) と相補な「直近の達成」を 1 関数で取り出す
 * substrate。週次 retro Doc / dashboard "今週やったこと" widget / AI 朝 brief の
 * 「最近の流れ」セクションが共通の式で揃う。
 *
 * 仕様:
 *  - `archivedAt == null` (archive 済は対象外)
 *  - `doneAt` が `today - thresholdDays` より新しい (default 7 日 = 1 週間)
 *  - 未来 `doneAt` (時計ズレ等) は除外、不正値は fail-soft で除外
 *  - 完了から経過した日数 (`daysSinceDone`) 昇順 (= 新しい順) で返す。同日は元順で stable。
 *
 * 0 件 sentinel `'完了 0 件 (直近 N 日)'`、title 欠落 `(無題)` fallback で
 * `formatStaleItemsSummary` と一貫した出力スタイル。
 */
import { parseDateOrNull } from '@/lib/date/iso'

/** 完了抽出に必要な Item の structural subset。 */
export interface FreshlyDoneItemFields {
  id?: string
  title?: string
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
}

export interface FreshlyDoneItemEntry<T extends FreshlyDoneItemFields> {
  item: T
  /** 完了からの経過日数 (床関数、0 = 今日完了) */
  daysSinceDone: number
}

export interface SelectFreshlyDoneItemsOptions {
  /** 完了とみなす期間 (日)。default 7 (= 1 週間)。 */
  thresholdDays?: number
}

export function selectFreshlyDoneItems<T extends FreshlyDoneItemFields>(
  items: readonly T[],
  options: SelectFreshlyDoneItemsOptions = {},
  today: Date | string = new Date(),
): FreshlyDoneItemEntry<T>[] {
  const thresholdDays = options.thresholdDays ?? 7
  const todayDate = parseDateOrNull(today)
  if (!todayDate) return []
  if (thresholdDays < 0) return []

  const enriched: { entry: FreshlyDoneItemEntry<T>; index: number }[] = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    if (!it) continue
    if (it.archivedAt) continue
    const doneAt = parseDateOrNull(it.doneAt)
    if (!doneAt) continue
    const diffMs = todayDate.getTime() - doneAt.getTime()
    if (diffMs < 0) continue // 未来完了 (時計ズレ等) は除外
    const daysSinceDone = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    if (daysSinceDone > thresholdDays) continue
    enriched.push({ entry: { item: it, daysSinceDone }, index: i })
  }
  enriched.sort((a, b) => {
    if (a.entry.daysSinceDone !== b.entry.daysSinceDone) {
      return a.entry.daysSinceDone - b.entry.daysSinceDone
    }
    return a.index - b.index
  })
  return enriched.map((e) => e.entry)
}

/**
 * AI prompt 用 1 行サマリ:
 *   `完了 3: A (今日) / B (3 日前) / C (5 日前)`
 * 0 件は `'完了 0 件 (直近 N 日)'`。title 欠落は `'(無題)'` fallback。
 *
 * `thresholdDays` を渡すと sentinel に反映 (`'完了 0 件 (直近 7 日)'` 等)。
 */
export function formatFreshlyDoneSummary<T extends FreshlyDoneItemFields>(
  entries: readonly FreshlyDoneItemEntry<T>[],
  thresholdDays: number = 7,
): string {
  if (entries.length === 0) return `完了 0 件 (直近 ${thresholdDays} 日)`
  const parts = entries.map((e) => {
    const title = e.item.title ?? '(無題)'
    const when = e.daysSinceDone === 0 ? '今日' : `${e.daysSinceDone} 日前`
    return `${title} (${when})`
  })
  return `完了 ${entries.length}: ${parts.join(' / ')}`
}

// iter305 refactor: parseDateOrNull (lib/date/iso) に集約。
