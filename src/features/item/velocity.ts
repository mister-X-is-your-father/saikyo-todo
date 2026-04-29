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
import { makeHintLabelFormatter } from '@/lib/hint'

import { bucketByPriorityWith, formatPriorityBucketsLabeled, type PriorityKey } from './priority'

export interface VelocityFields {
  doneAt: Date | string | null | undefined
}

export interface VelocityByPriorityFields extends VelocityFields {
  priority: number | null | undefined
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

/**
 * iter452 ai-automation: velocity を priority 別に集計する pure helper。
 *
 * iter386 / iter391 / iter406 / iter408 / iter414 / iter429 / iter432 / iter434 /
 * iter437 と並ぶ「× priority」軸シリーズの velocity 軸版 (10 弾目)。AI 朝 brief /
 * pm-agent prompt / dashboard widget が「直近 7 日: P1 done 3 件 / P3 done 5 件」
 * のような P 別 完了ペースを 1 関数で取り出せる substrate。「高優先消化が遅い /
 * 低優先ばかり消化」 bias 検出に使える (= iter354 wip-by-priority と相補、wip は
 * 'in_progress' / 本 helper は 'done')。
 *
 * 仕様:
 *  - 各 priority bucket で `computeVelocity` を呼び、count + avgPerDay を抽出
 *  - count=0 でも全 4 bucket は必ず初期化 (undefined チェック不要)
 *  - bucketByPriorityWith (iter365) を委譲
 */
export interface VelocityPriorityStats {
  count: number
  /** count / windowDays、小数点あり (= 件/日) */
  avgPerDay: number
}

export type VelocityByPriority = Record<PriorityKey, VelocityPriorityStats>

export function computeVelocityByPriority<T extends VelocityByPriorityFields>(
  items: readonly T[],
  options: VelocityOptions = {},
  today: Date | string = new Date(),
): VelocityByPriority {
  return bucketByPriorityWith(items, (group) => {
    const summary = computeVelocity(group, options, today)
    return { count: summary.total, avgPerDay: summary.avgPerDay }
  })
}

/**
 * AI prompt / dashboard chip aria-label 用 priority 別 1 行サマリ:
 *   '直近 7 日 velocity: P1 3 件 (0.4件/日) / P3 5 件 (0.7件/日)'
 *
 * count=0 bucket は省略、全 0 → '直近 7 日 velocity 0 件'。iter386/408/414/429/
 * 432/434/437 と同じ '{label}: P1 ... / P3 ...' 形式。
 */
export function formatVelocityByPriorityJa(
  byPriority: VelocityByPriority,
  windowDays: number = 7,
): string {
  return formatPriorityBucketsLabeled(
    byPriority,
    (k, s) => (s.count === 0 ? null : `P${k} ${s.count} 件 (${s.avgPerDay.toFixed(1)}件/日)`),
    `直近 ${windowDays} 日 velocity`,
    `直近 ${windowDays} 日 velocity 0 件`,
  )
}

/**
 * iter454 ai-automation: velocity の trend (up/flat/down) を「1 word jp ヒント」に
 * 整形する hint helper。既存 `VelocitySummary.trend` の英語 enum を「加速中 / 安定 /
 * 減速中 / 完了なし」の 4 状態 jp 表記に出し分け。
 *
 * iter424 / iter439 / iter442 / iter444 / iter447 / iter449 と並ぶ「item axis 1-word
 * state」シリーズの velocity-trend 軸版 (7 弾目)。AI 朝 brief / pm-agent / dashboard
 * chip / Slack 通知が「workspace の完了ペース傾向」を 1 word で出せる substrate。
 *
 * 4 状態:
 *  - 'idle' → '完了なし'   (total === 0、windowDays 内の done item ゼロ)
 *  - 'up'   → '加速中'      (前半 → 後半で +20%+ 増加)
 *  - 'flat' → '安定'        (-20% ≤ 増減 ≤ +20%)
 *  - 'down' → '減速中'      (前半 → 後半で -20%- 減少)
 *
 * 既存 `formatVelocitySummary` の trendLabel (= up/flat/down 英語) と相補で「英語
 * enum vs 1 word jp 文言」を出し分け。caller は trend を SR / chip aria-label に
 * 1 単語で込められる。
 */
export type VelocityHint = 'idle' | 'up' | 'flat' | 'down'

export function classifyVelocityHint(summary: VelocitySummary): VelocityHint {
  if (summary.total === 0) return 'idle'
  return summary.trend
}

const VELOCITY_HINT_LABEL_JA: Record<VelocityHint, string> = {
  idle: '完了なし',
  up: '加速中',
  flat: '安定',
  down: '減速中',
}

export const formatVelocityHintJa = makeHintLabelFormatter(
  classifyVelocityHint,
  VELOCITY_HINT_LABEL_JA,
)
