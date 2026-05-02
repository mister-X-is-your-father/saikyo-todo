/**
 * iter319 ai-automation: 直近 7 日 vs 先期間 7 日の作業時間 (total minutes) の
 * 推移を判定する pure helper。
 *
 * iter269 `bias-trend.ts` (見積精度の前後比較) と対称な「実作業量の前後比較」
 * substrate。bias-trend は「1.50× → 1.20× 改善」を返し、本 helper は
 * 「先週 12h → 今週 15h (+3h, +25%)」を返す。
 *
 * AI 朝 brief / pm-agent / dashboard widget の使い分け:
 *   - bias-trend: 見積精度の改善 (= 学習が進んでいるか)
 *   - weekly-time-trend: 稼働時間の増減 (= 忙しさの変化、PR 量との相関)
 *   - velocity (iter302 並走): 件数ペース (= done 数の傾向)
 *
 * 入力:
 *   - `entries`: `{ workDate, durationMinutes }` の配列。itemId は不問
 *     (item 紐付け無し / null も合算、稼働時間総量の話なので)。
 *   - `today`: 'YYYY-MM-DD'。比較対象の基準日 (= today を含む 7 日が thisWeek)。
 *
 * 仕様:
 *   - thisWeek = `[today-6, today]` (両端 inclusive、合計 7 日)
 *   - priorWeek = `[today-13, today-7]` (合計 7 日)
 *   - direction: thisWeek=prior=0 → 'idle' / Δ% 絶対値 < 5% → 'flat' / Δ>0 → 'up' / Δ<0 → 'down'
 *   - deltaPct: priorWeek=0 で thisWeek>0 → +Infinity (caller は null として扱う)、両 0 → 0
 *
 * 不正値 (durationMinutes が NaN/負/Infinity) は 0 加算で fail-soft、不正
 * workDate (空文字 / 形式違反) は除外。
 */

import { ISO_DATE_RE, shiftIsoDate } from '@/lib/date/iso'

import { formatMinutes } from './category-summary'
import { safeMinutes } from './safe-minutes'

export interface WeeklyTimeEntry {
  workDate: string
  durationMinutes: number
}

export type WeeklyTimeDirection = 'up' | 'down' | 'flat' | 'idle'

export interface WeeklyTimeTrend {
  thisWeekMinutes: number
  priorWeekMinutes: number
  /** 差 (this - prior)、minutes */
  deltaMinutes: number
  /** % 変化 (-100..+∞、priorWeek=0 のとき null) */
  deltaPct: number | null
  direction: WeeklyTimeDirection
}

const FLAT_THRESHOLD_PCT = 5

// iter330 refactor: shiftDays は lib/date/iso.ts#shiftIsoDate に集約 (2 callsite 重複削除)。

export function splitTimeEntriesByWeek(
  entries: readonly WeeklyTimeEntry[],
  today: string,
): { thisWeek: WeeklyTimeEntry[]; priorWeek: WeeklyTimeEntry[] } {
  if (!ISO_DATE_RE.test(today)) {
    return { thisWeek: [], priorWeek: [] }
  }
  const thisStart = shiftIsoDate(today, -6)
  const thisEnd = today
  const priorStart = shiftIsoDate(today, -13)
  const priorEnd = shiftIsoDate(today, -7)

  const thisWeek: WeeklyTimeEntry[] = []
  const priorWeek: WeeklyTimeEntry[] = []
  for (const e of entries) {
    if (!ISO_DATE_RE.test(e.workDate)) continue
    if (e.workDate >= thisStart && e.workDate <= thisEnd) {
      thisWeek.push(e)
    } else if (e.workDate >= priorStart && e.workDate <= priorEnd) {
      priorWeek.push(e)
    }
  }
  return { thisWeek, priorWeek }
}

function sumMinutes(entries: readonly WeeklyTimeEntry[]): number {
  let total = 0
  for (const e of entries) total += safeMinutes(e.durationMinutes)
  return total
}

export function computeWeeklyTimeTrend(
  thisWeek: readonly WeeklyTimeEntry[],
  priorWeek: readonly WeeklyTimeEntry[],
): WeeklyTimeTrend {
  const thisWeekMinutes = sumMinutes(thisWeek)
  const priorWeekMinutes = sumMinutes(priorWeek)
  const deltaMinutes = thisWeekMinutes - priorWeekMinutes
  let deltaPct: number | null = null
  if (priorWeekMinutes > 0) {
    deltaPct = Math.round((deltaMinutes / priorWeekMinutes) * 100)
  }

  let direction: WeeklyTimeDirection
  if (thisWeekMinutes === 0 && priorWeekMinutes === 0) {
    direction = 'idle'
  } else if (deltaPct !== null && Math.abs(deltaPct) < FLAT_THRESHOLD_PCT) {
    direction = 'flat'
  } else if (priorWeekMinutes === 0) {
    direction = 'up' // 先週 0 → 今週 +α は up (deltaPct=null だが direction は決まる)
  } else if (thisWeekMinutes === 0) {
    direction = 'down' // 先週あり → 今週 0 は down
  } else if (deltaMinutes > 0) {
    direction = 'up'
  } else if (deltaMinutes < 0) {
    direction = 'down'
  } else {
    direction = 'flat'
  }

  return { thisWeekMinutes, priorWeekMinutes, deltaMinutes, deltaPct, direction }
}

export function formatWeeklyTimeTrendJa(trend: WeeklyTimeTrend): string {
  if (trend.direction === 'idle') {
    return '直近 14 日: 稼働記録なし'
  }
  const cur = formatMinutes(trend.thisWeekMinutes)
  const prev = formatMinutes(trend.priorWeekMinutes)
  const sign = trend.deltaMinutes > 0 ? '+' : ''
  const delta = formatMinutes(Math.abs(trend.deltaMinutes))
  const pctPart =
    trend.deltaPct === null ? '' : ` (${trend.deltaPct >= 0 ? '+' : ''}${trend.deltaPct}%)`
  if (trend.direction === 'flat') {
    return `稼働時間: 安定 (先週 ${prev} → 今週 ${cur})`
  }
  if (trend.direction === 'up') {
    return `稼働時間: 増加 (先週 ${prev} → 今週 ${cur}、${sign}${delta}${pctPart})`
  }
  return `稼働時間: 減少 (先週 ${prev} → 今週 ${cur}、-${delta}${pctPart})`
}
