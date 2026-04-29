/**
 * iter302 ai-automation: items の完了 (doneAt) を「直近 N 日の日別 done 数」に
 * 集計する pure helper。
 *
 * iter294 (must-risk) / iter299 (stale-items) と並ぶ AI substrate。AI 朝 brief /
 * sprint burndown / pm-agent / dashboard widget が「直近 7 日の完了ペース」
 * (= velocity) を 1 関数で取り出せるようにする。今までは dashboard service が
 * SQL で集計、sprint burndown が inline で計算と 2 系統で別実装だった → pure
 * 関数として固定し prompt や UI で再利用可能に。
 *
 * 仕様:
 *  - 入力: items 配列 + `windowDays` (default 7) + `today` (default now)
 *  - 出力:
 *    - `byDay`: 各日の `{ date: 'YYYY-MM-DD', count }` を「古い順」に N 日分
 *    - `total`: 全 done 件数 (全期間 windowDays 以内)
 *    - `avgPerDay`: total / windowDays (小数点あり)
 *    - `trend`: 前半 N/2 日 vs 後半 N/2 日 の比較で `'up' | 'flat' | 'down'`
 *      ((後半 - 前半) / max(1, 前半) >= +0.2 → up、≤ -0.2 → down、それ以外 flat)
 *  - 不正 doneAt は除外 (fail-soft)、windowDays<=0 は空 result
 *  - archive 済 / deletedAt の done item は集計に含める (= 一度完了したものは消えない)
 */
import { formatLocalISO, MS_PER_DAY, parseDateOrNull, toLocalMidnight } from '@/lib/date/iso'

export interface VelocityFields {
  doneAt: Date | string | null | undefined
}

export interface VelocityDay {
  /** 'YYYY-MM-DD' (local TZ) */
  date: string
  count: number
}

export interface VelocitySummary {
  byDay: VelocityDay[]
  total: number
  avgPerDay: number
  trend: 'up' | 'flat' | 'down'
}

export interface VelocityOptions {
  /** 集計対象日数。default 7 (= 過去 7 日 + 今日 = 7 日 window)。 */
  windowDays?: number
}

/**
 * 直近 windowDays 日 (today 含む) の done count を日別 + 集計値で返す。
 * trend は 前半 N/2 日 / 後半 N/2 日 の done 数比較。
 */
export function computeVelocity<T extends VelocityFields>(
  items: readonly T[],
  options: VelocityOptions = {},
  today: Date | string = new Date(),
): VelocitySummary {
  const windowDays = options.windowDays ?? 7
  if (windowDays <= 0) {
    return { byDay: [], total: 0, avgPerDay: 0, trend: 'flat' }
  }
  const todayDate = toLocalMidnight(parseDateOrNull(today))
  if (!todayDate) {
    return { byDay: [], total: 0, avgPerDay: 0, trend: 'flat' }
  }

  // window: today から windowDays - 1 日前まで (= 合計 windowDays 日)
  const dayCounts = new Map<string, number>()
  const dates: string[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayDate.getTime() - i * MS_PER_DAY)
    const key = formatLocalISO(d)
    dayCounts.set(key, 0)
    dates.push(key)
  }

  for (const it of items) {
    const done = parseDateOrNull(it.doneAt)
    if (!done) continue
    const local = toLocalMidnight(done)
    if (!local) continue
    const key = formatLocalISO(local)
    if (!dayCounts.has(key)) continue
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }

  const byDay: VelocityDay[] = dates.map((date) => ({ date, count: dayCounts.get(date) ?? 0 }))
  const total = byDay.reduce((sum, d) => sum + d.count, 0)
  const avgPerDay = total / windowDays

  // trend: 前半 / 後半 を比較。windowDays が奇数の場合は中央 1 日を後半に含める
  const half = Math.floor(windowDays / 2)
  let firstHalf = 0
  let secondHalf = 0
  for (let i = 0; i < byDay.length; i++) {
    const day = byDay[i]
    if (!day) continue
    if (i < half) firstHalf += day.count
    else secondHalf += day.count
  }
  const trend = computeTrend(firstHalf, secondHalf)

  return { byDay, total, avgPerDay, trend }
}

function computeTrend(firstHalf: number, secondHalf: number): 'up' | 'flat' | 'down' {
  const denom = Math.max(1, firstHalf)
  const ratio = (secondHalf - firstHalf) / denom
  if (ratio >= 0.2) return 'up'
  if (ratio <= -0.2) return 'down'
  return 'flat'
}

/**
 * AI prompt 用 1 行サマリ:
 *   `直近 7 日 velocity: 12 件 (1.7 件/日、傾向 up)`
 * 0 件は `'直近 7 日 velocity: 0 件'`。
 */
export function formatVelocitySummary(summary: VelocitySummary, windowDays = 7): string {
  if (summary.total === 0) return `直近 ${windowDays} 日 velocity: 0 件`
  const avg = summary.avgPerDay.toFixed(1)
  const trendLabel: Record<VelocitySummary['trend'], string> = {
    up: 'up',
    flat: 'flat',
    down: 'down',
  }
  return `直近 ${windowDays} 日 velocity: ${summary.total} 件 (${avg} 件/日、傾向 ${trendLabel[summary.trend]})`
}

// iter305 refactor: parseDateOrNull (lib/date/iso) に集約 (3 callsite 重複削除)。
// iter340 refactor: toLocalMidnight / formatLocalISO も lib/date/iso に集約。
