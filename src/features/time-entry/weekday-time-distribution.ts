/**
 * iter324 ai-automation: time_entries を曜日別 (月-日) に集計する pure helper +
 * peak weekday 抽出 + 1 行 summary フォーマッタ。
 *
 * iter307 `category-summary.ts` (category 軸) / iter319 `weekly-time-trend.ts`
 * (時系列前後比較) と並ぶ「time_entries の第 3 軸 = 曜日軸」substrate。
 *
 * AI 朝 brief / pm-agent / dashboard widget が「あなたは火曜に稼働が集中して
 * います (4h 30min)」「金曜は 0min なので余力あり」のような曜日パターンを
 * 1 関数で取り出せる。今までは weekly-time-trend が 14 日合計、category-summary
 * が 5 カテゴリ合計に圧縮していたが、曜日方向の peak は別実装が必要だった。
 *
 * 入力:
 *   - `entries`: `{ workDate, durationMinutes }` の配列。category や itemId は不問
 *     (稼働時間の話なので合算)。
 *   - `options.from` / `options.to`: ISO `YYYY-MM-DD` で範囲フィルタ (両端 inclusive)。
 *
 * 仕様:
 *   - 曜日 key 順序: 月 → 火 → 水 → 木 → 金 → 土 → 日 (週初め月曜固定、business 風)
 *   - durationMinutes が NaN/負/Infinity は 0 加算で fail-soft、不正 workDate
 *     (空文字/形式違反/非実在日) は除外
 *   - peak: 最大の曜日 + minutes、tie 時は週前半 (月→日 順) を優先、全 0 → null
 */

import { formatMinutes } from './category-summary'
import { safeMinutes } from './safe-minutes'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

const WEEKDAY_LABEL_JA: Record<WeekdayKey, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
}

/** Sun=0, Mon=1, ..., Sat=6 を WEEKDAY_KEYS index に変換 (mon=0..sun=6)。 */
const JS_DAY_TO_KEY: readonly WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export type WeekdayMinutes = Record<WeekdayKey, number>

export interface WeekdayTimeEntry {
  workDate: string
  durationMinutes: number
}

export interface GroupTimeByWeekdayOptions {
  /** ISO `YYYY-MM-DD` 以降 (inclusive)。未指定で下限なし */
  from?: string
  /** ISO `YYYY-MM-DD` 以前 (inclusive)。未指定で上限なし */
  to?: string
}

function emptyMinutes(): WeekdayMinutes {
  return { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
}

function parseWorkDate(iso: string): Date | null {
  if (!ISO_DATE_RE.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  // UTC で構築して TZ shift を排除 (workDate は date-only なので時刻不要)
  const t = Date.UTC(y, m - 1, d)
  const out = new Date(t)
  // 非実在日 (例: 2026-02-30 → 3/2 に正規化される) を弾く
  if (out.getUTCFullYear() !== y || out.getUTCMonth() !== m - 1 || out.getUTCDate() !== d) {
    return null
  }
  return out
}

/**
 * entries を曜日別 (月-日) 合計分に groupBy。範囲外 (from/to) は除外、
 * 不正 durationMinutes は 0 加算、不正 workDate は除外。
 */
export function groupTimeEntriesByWeekday(
  entries: readonly WeekdayTimeEntry[],
  options: GroupTimeByWeekdayOptions = {},
): WeekdayMinutes {
  const totals = emptyMinutes()
  for (const e of entries) {
    if (!e) continue
    if (options.from && e.workDate < options.from) continue
    if (options.to && e.workDate > options.to) continue
    const d = parseWorkDate(e.workDate)
    if (!d) continue
    const key = JS_DAY_TO_KEY[d.getUTCDay()]
    if (!key) continue
    totals[key] += safeMinutes(e.durationMinutes)
  }
  return totals
}

export function weekdayLabelJa(key: WeekdayKey): string {
  return WEEKDAY_LABEL_JA[key]
}

export interface WeekdayPeak {
  key: WeekdayKey
  minutes: number
}

/** 最大の曜日 + minutes。tie は週前半 (月→日) 優先、全 0 → null。 */
export function findPeakWeekday(totals: Readonly<WeekdayMinutes>): WeekdayPeak | null {
  let peak: WeekdayPeak | null = null
  for (const k of WEEKDAY_KEYS) {
    const m = totals[k]
    if (m <= 0) continue
    if (!peak || m > peak.minutes) peak = { key: k, minutes: m }
  }
  return peak
}

export interface FormatWeekdayDistributionOptions {
  /** 0 分曜日を省略するか (default true)。false で 7 曜日全表示 */
  hideZero?: boolean
}

/**
 * 曜日別合計を 1 行整形:
 *   `月 4h / 火 6h / 水 5h` (hideZero=true、default)
 *   `月 4h / 火 6h / 水 5h / 木 0min / 金 0min / 土 0min / 日 0min` (hideZero=false)
 *   `'0 件'` (全 0)
 */
export function formatWeekdayTimeDistributionJa(
  totals: Readonly<WeekdayMinutes>,
  options: FormatWeekdayDistributionOptions = {},
): string {
  const hideZero = options.hideZero ?? true
  const parts: string[] = []
  for (const k of WEEKDAY_KEYS) {
    const m = totals[k]
    if (hideZero && m === 0) continue
    parts.push(`${WEEKDAY_LABEL_JA[k]} ${formatMinutes(m)}`)
  }
  if (parts.length === 0) return '0 件'
  return parts.join(' / ')
}
