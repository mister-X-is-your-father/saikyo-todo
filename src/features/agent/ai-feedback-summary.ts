/**
 * iter1411 (queue AC-6 substrate): AI 出力 quality feedback (1-5) の集計 pure helper。
 *
 * 設計目的 (FEEDBACK_QUEUE.md AI 分業/協業 シリーズ AC-6):
 *   - 各 AI 成果物 (plan / decompose / research / review) に「役立った? 1-5」 user
 *     feedback を structured で蓄積し、prompt 改善 / 監視に使う。
 *   - 本 helper は蓄積された rating 列を入力に、平均 / 分布 / 好評率 を deterministic に
 *     算出 (= dashboard chip / Slack monitor / prompt tuning の input)。
 *
 * 妥当性: rating は 1-5 の整数のみ採用、範囲外 / 非整数 / NaN は除外 (汚れた入力に頑健)。
 * AI 不使用、副作用無し。pure helper + Vitest 単体で網羅。
 */
import { rateToPct } from '@/lib/format-rate'
import { round1 } from '@/lib/round-decimal'

export interface AiFeedbackEntry {
  /** 1-5 の整数 (範囲外 / 非整数は集計から除外) */
  rating: number
  /** 任意: 成果物種別 ('plan' / 'decompose' / ...) */
  kind?: string | null
  /** 任意: 評価時刻 */
  at?: Date | string | null
}

export interface AiFeedbackSummary {
  /** 有効 rating の件数 */
  count: number
  /** 平均 (round1)、count=0 は null */
  avg: number | null
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  /** rating >= 4 */
  positiveCount: number
  /** rating <= 2 */
  negativeCount: number
  /** positive / count *100 (整数)、count=0 は null */
  positiveRate: number | null
}

function isValidRating(r: number): r is 1 | 2 | 3 | 4 | 5 {
  return Number.isInteger(r) && r >= 1 && r <= 5
}

export function summarizeAiFeedback(entries: readonly AiFeedbackEntry[]): AiFeedbackSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  let count = 0
  let positiveCount = 0
  let negativeCount = 0

  for (const e of entries) {
    if (!isValidRating(e.rating)) continue
    distribution[e.rating] += 1
    sum += e.rating
    count += 1
    if (e.rating >= 4) positiveCount += 1
    else if (e.rating <= 2) negativeCount += 1
  }

  return {
    count,
    avg: count === 0 ? null : round1(sum / count),
    distribution,
    positiveCount,
    negativeCount,
    positiveRate: count === 0 ? null : rateToPct(positiveCount / count),
  }
}

/**
 * chip / Slack / prompt-tuning monitor 用 1 行 summary。
 *   'AI 評価: 平均 4.2 (12 件・好評 75%)'
 *   '評価なし'                              (count 0)
 */
export function formatAiFeedbackSummaryJa(summary: AiFeedbackSummary): string {
  if (summary.count === 0 || summary.avg === null) return '評価なし'
  return `AI 評価: 平均 ${summary.avg} (${summary.count} 件・好評 ${summary.positiveRate}%)`
}

/**
 * 監視 tone: 平均 / 好評率で 4 段階。prompt 劣化の早期検知用。
 *   - 'good'  : avg >= 4.0
 *   - 'ok'    : avg >= 3.0
 *   - 'poor'  : avg < 3.0
 *   - 'idle'  : 評価なし
 */
export function aiFeedbackTone(summary: AiFeedbackSummary): 'good' | 'ok' | 'poor' | 'idle' {
  if (summary.avg === null) return 'idle'
  if (summary.avg >= 4.0) return 'good'
  if (summary.avg >= 3.0) return 'ok'
  return 'poor'
}
