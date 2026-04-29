/**
 * iter334 ai-automation: 完了 item の所要日数 (`doneAt - createdAt`) を **priority
 * 別** に集計する pure helper。
 *
 * iter312 `period-completion.ts` (期間 × 全 priority 合算 avg) と iter292 priority.ts
 * (priority 件数分布) を組み合わせた「priority 軸での所要時間学習」 substrate。
 * AI 朝 brief / pm-agent / dashboard widget が「P1 平均 2.5日 / P2 4.0日 / P3
 * 6.0日 / P4 14.0日」を 1 関数で取り出して「低優先 item ほど着手が後回しになる」
 * の bias 検出に使える。
 *
 * iter269 bias-trend (見積 vs 実績) は時間 axis、本 helper は priority axis、
 * iter319 weekly-time-trend は週 axis、と「学習対象 dimension」を増やしていく。
 *
 * 仕様:
 *   - input: items 配列 ({priority, createdAt, doneAt} の structural subset)
 *   - 完了済 (doneAt 有効) かつ createdAt 有効、doneAt >= createdAt の item のみ集計
 *   - priority 1..4 (range 外 / null / undefined は p4 = priority.ts の normalize と同じ)
 *   - options.since (Date | ISO 文字列) で doneAt >= since の item のみに限定
 *   - 各 priority bucket は count + avgDays (round 1 桁)、count=0 で avgDays=null
 *
 * 不正値 fail-soft:
 *   - createdAt / doneAt が不正 (NaN/null/未指定) → entry 除外
 *   - doneAt < createdAt (時計ズレ等) → entry 除外
 *   - since 不正 → 全件 (= since 未指定と同じ)
 */

import { parseDateOrNull } from '@/lib/date/iso'

import { PRIORITY_ORDER } from './priority'

export type PriorityKey = 1 | 2 | 3 | 4

const PRIORITY_LABEL: Record<PriorityKey, string> = {
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
}

export interface CompletionDaysFields {
  priority: number | null | undefined
  createdAt: Date | string | null | undefined
  doneAt: Date | string | null | undefined
}

export interface PriorityCompletionStats {
  count: number
  /** 平均所要日数 (round 1 桁)、count=0 で null */
  avgDays: number | null
}

export type CompletionDaysByPriority = Record<PriorityKey, PriorityCompletionStats>

export interface ComputeCompletionDaysOptions {
  /** doneAt >= since の item のみ集計 (Date | ISO 文字列) */
  since?: Date | string
}

function emptyStats(): CompletionDaysByPriority {
  return {
    1: { count: 0, avgDays: null },
    2: { count: 0, avgDays: null },
    3: { count: 0, avgDays: null },
    4: { count: 0, avgDays: null },
  }
}

function normalizePriority(p: number | null | undefined): PriorityKey {
  if (p === 1 || p === 2 || p === 3) return p
  return 4
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function computeCompletionDaysByPriority<T extends CompletionDaysFields>(
  items: readonly T[],
  options: ComputeCompletionDaysOptions = {},
): CompletionDaysByPriority {
  const since = options.since ? parseDateOrNull(options.since) : null
  const sums: Record<PriorityKey, { totalMs: number; count: number }> = {
    1: { totalMs: 0, count: 0 },
    2: { totalMs: 0, count: 0 },
    3: { totalMs: 0, count: 0 },
    4: { totalMs: 0, count: 0 },
  }

  for (const it of items) {
    const created = parseDateOrNull(it.createdAt)
    const done = parseDateOrNull(it.doneAt)
    if (!created || !done) continue
    if (done.getTime() < created.getTime()) continue
    if (since && done.getTime() < since.getTime()) continue
    const key = normalizePriority(it.priority)
    sums[key].totalMs += done.getTime() - created.getTime()
    sums[key].count += 1
  }

  const result = emptyStats()
  for (const k of PRIORITY_ORDER) {
    const { totalMs, count } = sums[k]
    if (count === 0) continue
    result[k] = {
      count,
      avgDays: Math.round((totalMs / count / MS_PER_DAY) * 10) / 10,
    }
  }
  return result
}

/**
 * AI prompt 用 1 行 summary:
 *   `'完了所要: P1 2.5日 (n=3) / P2 4.0日 (n=5) / P3 6.0日 (n=2)'`
 * count=0 の bucket は省略、全 0 → `'完了 0 件 (該当なし)'`。
 */
export function formatCompletionDaysByPriorityJa(
  stats: Readonly<CompletionDaysByPriority>,
): string {
  const parts: string[] = []
  for (const k of PRIORITY_ORDER) {
    const s = stats[k]
    if (s.count === 0 || s.avgDays === null) continue
    parts.push(`${PRIORITY_LABEL[k]} ${s.avgDays}日 (n=${s.count})`)
  }
  if (parts.length === 0) return '完了 0 件 (該当なし)'
  return `完了所要: ${parts.join(' / ')}`
}

/**
 * 高優先 (P1) と低優先 (P4) の所要差を算出。「P4 が P1 より N 日遅い」を 1 関数で。
 * いずれかの bucket が空なら null (比較不可能)。
 */
export interface PriorityLatencyGap {
  highKey: PriorityKey
  lowKey: PriorityKey
  highDays: number
  lowDays: number
  gapDays: number
}

export function computePriorityLatencyGap(
  stats: Readonly<CompletionDaysByPriority>,
): PriorityLatencyGap | null {
  // 最高 priority (有効) と最低 priority (有効) を探す
  let high: PriorityKey | null = null
  let low: PriorityKey | null = null
  for (const k of PRIORITY_ORDER) {
    if (stats[k].count > 0 && stats[k].avgDays !== null) {
      if (high === null) high = k
      low = k
    }
  }
  if (high === null || low === null || high === low) return null
  const highDays = stats[high].avgDays as number
  const lowDays = stats[low].avgDays as number
  return {
    highKey: high,
    lowKey: low,
    highDays,
    lowDays,
    gapDays: Math.round((lowDays - highDays) * 10) / 10,
  }
}
