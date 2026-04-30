/**
 * iter466 P0 (queue: チームメンバー余裕時間 一覧 scope A): capacity 計算用に
 * 「今日 / 今週」期間境界 + dueDate range filter の pure helper を集約。
 *
 * iter465 `computeMemberCapacityLoad` の上流で「period filter された items」を
 * 揃える substrate。次 iter で workspace home の MemberCapacityPanel が
 * 1 関数で「member の今日 / 今週の Item」を fetch (= computeMemberCapacityLoad
 * へ pre-filter 済 items を渡す) できる。
 *
 * 既存資産:
 *  - `formatLocalISO` / `parseIsoDateAsLocalMidnight` / `shiftIsoDate` (lib/date/iso)
 *  - `MS_PER_DAY` (lib/date/iso)
 *
 * 仕様:
 *  - week 境界: ISO 8601 週 (月-日)。今日が月曜なら from=今日 / to=今日+6 (日曜)
 *  - day 境界: 今日 = from = to
 *  - 不正 today (NaN time) → null sentinel (caller は chip 非表示)
 */

import { formatLocalISO, MS_PER_DAY, shiftIsoDate } from '@/lib/date/iso'

export interface DateRangeIso {
  /** 範囲開始 (inclusive) `YYYY-MM-DD` */
  from: string
  /** 範囲終了 (inclusive) `YYYY-MM-DD` */
  to: string
}

/**
 * `today` を含む ISO 週 (月-日) の `from` (月曜) / `to` (日曜) を返す。
 * 不正 Date (NaN) は null。
 *
 * 仕様:
 *  - 月曜起点 (ISO 8601)。`today.getDay()` は日=0 / 月=1 / ... / 土=6
 *  - 月曜オフセット = (day === 0 ? 6 : day - 1) (= 月曜 0 / 火曜 1 / ... / 日曜 6)
 *  - from = today - オフセット日、to = from + 6 日
 *  - ローカル TZ (= `formatLocalISO`) で固定 (caller の TZ で「今週」が直感に合う)
 */
export function getIsoWeekRange(today: Date): DateRangeIso | null {
  if (!today || Number.isNaN(today.getTime())) return null
  const day = today.getDay()
  const offset = day === 0 ? 6 : day - 1
  const from = new Date(today.getTime() - offset * MS_PER_DAY)
  const to = new Date(from.getTime() + 6 * MS_PER_DAY)
  return { from: formatLocalISO(from), to: formatLocalISO(to) }
}

/**
 * `today` 1 日のみの range。trivial wrapper だが API 整合性のため pair で公開。
 * 不正 Date (NaN) は null。
 */
export function getDayRange(today: Date): DateRangeIso | null {
  if (!today || Number.isNaN(today.getTime())) return null
  const iso = formatLocalISO(today)
  return { from: iso, to: iso }
}

/**
 * `today` から N 日先 (今日 + 0..N-1) の range を返す。N=1 なら 今日のみ、N=7 なら
 * 今日含む 7 日間 (= rolling 1 週間)。N <= 0 / 不正 today は null。
 *
 * caller benefits: "次の 7 日 (今日含む)" を表示したい dashboard 等で `getIsoWeekRange`
 * (= 月-日 固定) と使い分け可能。
 */
export function getRollingDayRange(today: Date, days: number): DateRangeIso | null {
  if (!today || Number.isNaN(today.getTime())) return null
  if (!Number.isFinite(days) || days <= 0) return null
  const from = formatLocalISO(today)
  const to = shiftIsoDate(from, days - 1)
  return { from, to }
}

/**
 * dueDate ISO `YYYY-MM-DD` が `range.from..range.to` (inclusive、両端含む) に含まれるか。
 *  - dueDate が null / 空文字 / 不正 → false (= range 外として扱う)
 *  - range が null → false
 *  - dueDate を string compare (lexicographic) で OK (`YYYY-MM-DD` は ISO 8601 で
 *    辞書順 = 時系列順)
 */
export function isDueDateInRange(
  dueDate: string | null | undefined,
  range: DateRangeIso | null,
): boolean {
  if (!dueDate || !range) return false
  return dueDate >= range.from && dueDate <= range.to
}

/**
 * items を dueDate range で filter。`dueDate` が null / range 外の Item は除外。
 *
 * caller benefits: `selectItemsByDueDateInRange(items, getIsoWeekRange(today))` →
 * `computeMemberCapacityLoad` の chain で「今週 capacity 」が 2 行で出る。
 * generic `<T>` を使うので caller の Item 型を壊さない (Item / 簡易 mock / etc 何でも OK)。
 */
export function selectItemsByDueDateInRange<T extends { dueDate: string | null | undefined }>(
  items: ReadonlyArray<T>,
  range: DateRangeIso | null,
): T[] {
  if (!range) return []
  return items.filter((it) => isDueDateInRange(it.dueDate, range))
}
