/**
 * iter317 ai-automation: time_entries を **item 別** に集計する pure helper +
 * top N ranking + 1 行 summary フォーマッタ。
 *
 * iter307 並走 `category-summary.ts` (5 カテゴリ別) / iter314 `daily-summary.ts`
 * (日次) と並ぶ「時間の見方」第 3 軸 — **item 単位**。Scope B (Document PiP) で
 * タイマー実用性が上がった今、「今日 / 今週 どの Item に何時間使ったか」を
 * AI 朝 brief / 個別 Item ダイアログ「実績」 chip / dashboard 「top items by
 * time」widget が 1 関数で取れる substrate。
 *
 * 入力:
 *   - `entries`: `{ workDate, itemId, durationMinutes }` の配列。`itemId=null`
 *     (item 未紐付けの自由稼働) は集計から除外 (item 別集計の意味なし)。
 *   - `options.from` / `options.to` ISO `YYYY-MM-DD` 範囲フィルタ (両端 inclusive)。
 *
 * 出力:
 *   - `groupTimeEntriesByItem(entries, options?)`:
 *       `Map<itemId, ItemTimeStats>`。`{totalMinutes, entryCount}`。
 *       全 itemId で Map に乗る (件数 0 はそもそも入らない、頻度 1 以上のみ)。
 *   - `selectTopItemsByTime(entries, n, options?)`:
 *       `[{itemId, totalMinutes, entryCount}, ...]` を totalMinutes desc + 同分は
 *       entryCount desc + 同件は itemId asc で stable sort。n<=0 で空配列、
 *       過剰指定で全件 (slice 上限 = 集計済 item 数)。
 *   - `formatTopItemsByTime(top, titles?)`:
 *       `'実績 top 3: A (4h 30min) / B (1h 15min) / C (45min)'` 形式の AI prompt /
 *       chip 用 1 行。0 件 sentinel `'実績 0 件 (該当なし)'`、`titles` Map で itemId
 *       → 表示 title を引く (欠落は `'(無題: <id 先頭 8 文字>)'` で fallback)。
 *
 * 不正値 (durationMinutes が NaN/負/Infinity) は加算前に 0 クランプで fail-soft、
 * 範囲外 entry は除外、0 加算 entry は entryCount にカウントしない (= 完全 ignore)。
 */

import { ISO_DATE_RE } from '@/lib/date/iso'
import { formatMinutesJa } from '@/lib/format-duration'

import { safeMinutes } from './safe-minutes'

/** 集計に必要な最小 structural subset (TimeEntry のサブセット)。 */
export interface ItemTimeEntry {
  /** ISO `YYYY-MM-DD`。範囲フィルタに使う */
  workDate: string
  /** 紐付け先 Item の uuid。null は item 未紐付け = 集計から除外 */
  itemId: string | null
  /** 分単位、負/NaN/Infinity は 0 として扱い加算しない (= entryCount もカウントしない) */
  durationMinutes: number
}

export interface ItemTimeStats {
  totalMinutes: number
  entryCount: number
}

export interface ItemTimeRanked {
  itemId: string
  totalMinutes: number
  entryCount: number
}

export interface GroupItemTimeOptions {
  /** ISO `YYYY-MM-DD` 以降 (inclusive)。未指定で下限なし */
  from?: string
  /** ISO `YYYY-MM-DD` 以前 (inclusive)。未指定で上限なし */
  to?: string
}

function inRange(workDate: string, from?: string, to?: string): boolean {
  if (!ISO_DATE_RE.test(workDate)) return false
  if (from && workDate < from) return false
  if (to && workDate > to) return false
  return true
}

export function groupTimeEntriesByItem(
  entries: readonly ItemTimeEntry[],
  options: GroupItemTimeOptions = {},
): Map<string, ItemTimeStats> {
  const result = new Map<string, ItemTimeStats>()
  for (const e of entries) {
    if (!e.itemId) continue
    if (!inRange(e.workDate, options.from, options.to)) continue
    const min = safeMinutes(e.durationMinutes)
    if (min === 0) continue
    const cur = result.get(e.itemId)
    if (cur) {
      cur.totalMinutes += min
      cur.entryCount += 1
    } else {
      result.set(e.itemId, { totalMinutes: min, entryCount: 1 })
    }
  }
  return result
}

export function selectTopItemsByTime(
  entries: readonly ItemTimeEntry[],
  n: number,
  options: GroupItemTimeOptions = {},
): ItemTimeRanked[] {
  if (!Number.isFinite(n) || n <= 0) return []
  const grouped = groupTimeEntriesByItem(entries, options)
  const ranked: ItemTimeRanked[] = []
  for (const [itemId, stats] of grouped) {
    ranked.push({ itemId, totalMinutes: stats.totalMinutes, entryCount: stats.entryCount })
  }
  ranked.sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes
    if (b.entryCount !== a.entryCount) return b.entryCount - a.entryCount
    return a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0
  })
  return ranked.slice(0, Math.floor(n))
}

function fallbackTitle(itemId: string): string {
  return `(無題: ${itemId.slice(0, 8)})`
}

export function formatTopItemsByTime(
  top: readonly ItemTimeRanked[],
  titles?: ReadonlyMap<string, string>,
): string {
  if (top.length === 0) return '実績 0 件 (該当なし)'
  const parts = top.map((r) => {
    const t = titles?.get(r.itemId) ?? fallbackTitle(r.itemId)
    return `${t} (${formatMinutesJa(r.totalMinutes)})`
  })
  return `実績 top ${top.length}: ${parts.join(' / ')}`
}
