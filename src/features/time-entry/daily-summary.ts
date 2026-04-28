/**
 * iter314 ai-automation: time_entries を **日別** に集計する pure helper。
 *
 * iter307 並走 (`category-summary.ts`) で「カテゴリ別 × 期間内合計」を整備済。
 * 本 iter は **日別 × 合計分** の対称軸。AI 朝 brief / dashboard widget /
 * sparkline が「直近 N 日の作業時間トレンド」を 1 関数で取り出せる substrate。
 *
 * 仕様:
 *  - `groupTimeEntriesByDay(entries, options?)`:
 *      `Map<workDate, totalMinutes>` を返す。`from`/`to` で範囲 inclusive、
 *      不正 durationMinutes は 0 加算 fail-soft。Map の挿入順は entries 順
 *      (caller が日付 sort したい場合は別途整列)
 *  - `dailyMinutesSeries(entries, options?, today?)`:
 *      `today - windowDays + 1` から `today` までの N 日連続列を返す
 *      (= 0 件日も `{ date, minutes: 0 }` で含める、sparkline / line chart 用)
 *  - `formatDailyMinutesSeries(series)`:
 *      `'4/27 5h / 4/26 3h / 4/25 4h'` 形式 (新しい順)。0 分日は省略、
 *      全 0 → `'0 件'`
 *  - `totalDailyMinutes(map)`: 合計分
 *
 * iter307 (category-summary) で既に `formatMinutes` を export 済 → 再利用、
 * 表記の一貫性 (`4h 30min` / `30min`) を保つ。
 */

import { formatMinutes } from './category-summary'

/** 集計に必要な最小 structural subset。 */
export interface DailySummaryEntry {
  /** ISO `YYYY-MM-DD` */
  workDate: string
  /** 分単位、負/NaN は 0 として加算 */
  durationMinutes: number
}

export interface GroupOptions {
  /** ISO `YYYY-MM-DD` 以降 (inclusive) */
  from?: string
  /** ISO `YYYY-MM-DD` 以前 (inclusive) */
  to?: string
}

export interface DailyMinutes {
  /** ISO `YYYY-MM-DD` */
  date: string
  minutes: number
}

export interface SeriesOptions extends GroupOptions {
  /** 連続 N 日の系列を返す (default 7、today 含む) */
  windowDays?: number
}

/** entries を workDate → 合計分の Map に集計。 */
export function groupTimeEntriesByDay(
  entries: readonly DailySummaryEntry[],
  options: GroupOptions = {},
): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!e?.workDate) continue
    if (options.from && e.workDate < options.from) continue
    if (options.to && e.workDate > options.to) continue
    const min = Number.isFinite(e.durationMinutes) ? Math.max(0, e.durationMinutes) : 0
    map.set(e.workDate, (map.get(e.workDate) ?? 0) + min)
  }
  return map
}

/**
 * `today - windowDays + 1` 〜 `today` の N 日連続系列 (古い順) を返す。
 * 0 件日も `{date, minutes: 0}` で含めるので sparkline がギャップなく描ける。
 */
export function dailyMinutesSeries(
  entries: readonly DailySummaryEntry[],
  options: SeriesOptions = {},
  today: Date | string = new Date(),
): DailyMinutes[] {
  const windowDays = options.windowDays ?? 7
  if (windowDays <= 0) return []
  const todayDate = typeof today === 'string' ? parseDate(today) : toLocalMidnight(today)
  if (!todayDate) return []
  const grouped = groupTimeEntriesByDay(entries, options)

  const series: DailyMinutes[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setDate(d.getDate() - i)
    const dateISO = formatISODate(d)
    series.push({ date: dateISO, minutes: grouped.get(dateISO) ?? 0 })
  }
  return series
}

/**
 * series を新しい順 (= 後ろから) で 1 行整形。0 分日は省略、全 0 → `'0 件'`。
 * 例: `'4/27 5h / 4/26 3h / 4/25 4h'`
 */
export function formatDailyMinutesSeries(series: readonly DailyMinutes[]): string {
  const reversed = [...series].reverse()
  const parts: string[] = []
  for (const d of reversed) {
    if (d.minutes === 0) continue
    parts.push(`${formatShortDate(d.date)} ${formatMinutes(d.minutes)}`)
  }
  return parts.length === 0 ? '0 件' : parts.join(' / ')
}

/** map の合計分。 */
export function totalDailyMinutes(map: ReadonlyMap<string, number>): number {
  let sum = 0
  for (const v of map.values()) sum += v
  return sum
}

// ----------------------------------------------------------------------
// internal helpers
// ----------------------------------------------------------------------

function toLocalMidnight(d: Date): Date | null {
  if (!d || Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d)
}

function formatISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' → 'M/D' (年は省略、ローカル月日のみ)。不正は raw を返す。 */
function formatShortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${Number(m[2])}/${Number(m[3])}`
}
