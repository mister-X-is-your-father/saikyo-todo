/**
 * iter307 ai-automation: time_entries を category 別に集計する pure helper +
 * 1 行 summary フォーマッタ。
 *
 * AI 朝 brief / 週次 retro Doc / dashboard widget が「今日 / 今週の作業時間」を
 * カテゴリ別に 1 関数で取得できる substrate。今までは bias-* family が calibration
 * 観点で集計していたが、UI / prompt 用の単純な「カテゴリ × 合計分」集計は
 * 個別 caller が inline で書く必要があった (dashboard / time-entry-list / 朝 brief
 * の 3 系統で別実装の可能性)。
 *
 * 入力: time_entries の配列 ({ workDate, category, durationMinutes })。
 * 出力:
 *   - `groupTimeEntriesByCategory(entries, options?, today?)`:
 *       全 5 カテゴリ (dev / meeting / research / ops / other) を空 0 で初期化した
 *       `Record<TimeEntryCategoryKey, number>` に各 entry の durationMinutes を加算。
 *       `from` / `to` 日付指定で範囲外は除外、`from`/`to` なら全件。
 *   - `formatCategorySummary(grouped, opts?)`:
 *       `'開発 4h 30min / MTG 1h / 調査 30min / 運用 0min / その他 0min'` 形式で
 *       1 行。`hideZero=true` (default) で 0 件カテゴリは省略、全 0 → `'0 件'`。
 *
 * 不正値 (durationMinutes が NaN/負/null) は加算前に 0 クランプで fail-soft、
 * 不正 category は 'other' に集約。
 */

import { categoryLabel, TIME_ENTRY_CATEGORIES, type TimeEntryCategoryKey } from './categories'

/** 集計に必要な最小 structural subset (TimeEntry のサブセット)。 */
export interface CategorySummaryEntry {
  /** ISO `YYYY-MM-DD`。範囲フィルタに使う */
  workDate: string
  /** TimeEntryCategoryKey、未知は 'other' に集約 */
  category: string
  /** 分単位、負/NaN は 0 として加算 */
  durationMinutes: number
}

export type CategoryTotals = Record<TimeEntryCategoryKey, number>

export interface GroupTimeEntriesOptions {
  /** ISO `YYYY-MM-DD` 以降 (inclusive)。未指定で下限なし */
  from?: string
  /** ISO `YYYY-MM-DD` 以前 (inclusive)。未指定で上限なし */
  to?: string
}

const KEY_ORDER: readonly TimeEntryCategoryKey[] = TIME_ENTRY_CATEGORIES.map((c) => c.key)
const KEY_SET: ReadonlySet<string> = new Set(KEY_ORDER)

/** 5 カテゴリ全て 0 で初期化した totals オブジェクト。 */
function emptyTotals(): CategoryTotals {
  const t = {} as CategoryTotals
  for (const k of KEY_ORDER) t[k] = 0
  return t
}

/**
 * entries を category 別に groupBy + sum (分単位)。範囲外 (from/to) は除外、
 * 不正 durationMinutes (NaN / 負 / null) は 0 加算で fail-soft、未知 category は
 * 'other' に集約。
 */
export function groupTimeEntriesByCategory(
  entries: readonly CategorySummaryEntry[],
  options: GroupTimeEntriesOptions = {},
): CategoryTotals {
  const totals = emptyTotals()
  for (const e of entries) {
    if (!e) continue
    if (options.from && e.workDate < options.from) continue
    if (options.to && e.workDate > options.to) continue
    const key: TimeEntryCategoryKey = (
      KEY_SET.has(e.category) ? e.category : 'other'
    ) as TimeEntryCategoryKey
    const min = Number.isFinite(e.durationMinutes) ? Math.max(0, e.durationMinutes) : 0
    totals[key] += min
  }
  return totals
}

/** 分を `'4h 30min'` / `'30min'` / `'2h'` / `'0min'` に整形。 */
export function formatMinutes(min: number): string {
  const safe = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 0
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export interface FormatCategorySummaryOptions {
  /** 0 分カテゴリを省略するか (default true)。false で全 5 カテゴリを表示 */
  hideZero?: boolean
}

/**
 * カテゴリ別合計を 1 行に整形。category の固定順 (dev → meeting → research →
 * ops → other) を保つ。`hideZero=true` (default) で 0 件は省略、全 0 → `'0 件'`。
 */
export function formatCategorySummary(
  totals: Readonly<CategoryTotals>,
  options: FormatCategorySummaryOptions = {},
): string {
  const hideZero = options.hideZero ?? true
  const parts: string[] = []
  for (const k of KEY_ORDER) {
    const min = totals[k]
    if (hideZero && min === 0) continue
    parts.push(`${categoryLabel(k)} ${formatMinutes(min)}`)
  }
  if (parts.length === 0) return '0 件'
  return parts.join(' / ')
}

/** totals を加算した合計分。dashboard で「今日合計 5h」表示に使う。 */
export function totalCategoryMinutes(totals: Readonly<CategoryTotals>): number {
  let sum = 0
  for (const k of KEY_ORDER) sum += totals[k]
  return sum
}
