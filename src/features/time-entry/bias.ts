/**
 * 過去 N 日の estimate vs actual bias を集計する純粋ヘルパ (iter257 ai-automation)。
 *
 * 既存の `formatVariance` (src/lib/stores/active-timer.ts) は timer Stop 時の
 * 1 件ずつのフィードバックだった。本ヘルパは複数 sample をまとめて統計を取り、
 * 「あなたは見積を 1.3× 過小評価しがちです」「直近 30 日の見積±10% 内が 65%」
 * のような自己観察 insight を AI brief / dashboard / pm-agent に渡せる
 * 構造体に整える。
 *
 * tolerance / bias 区分は `formatVariance` と一致させる (10% / 最低 1 分)。
 * pure 関数なので caller (server action / hooks / agent tool) は
 * `{actualMinutes, estimateMinutes}[]` の sample 配列を渡すだけ。
 */

import { rateToPct } from '@/lib/format-rate'
import type { Severity } from '@/lib/widget/severity'
import { aggregateCountsBySeverity } from '@/lib/widget/severity-bridges'

export interface BiasSample {
  actualMinutes: number
  estimateMinutes: number | null
}

export type BiasTendency =
  | 'on-track' // ±10% 以内が支配的
  | 'underestimating' // 見積が低すぎ (= actual > estimate が多い)
  | 'overestimating' // 見積が高すぎ (= actual < estimate が多い)
  | 'mixed' // どちらも一定数
  | 'unknown' // sample 不足 (estimate 付き <3 件)

export interface EstimateBiasReport {
  totalCount: number
  withEstimateCount: number
  underCount: number
  onCount: number
  overCount: number
  /** estimate 付き sample の actual/estimate 比率の中央値 (0 件なら null) */
  medianRatio: number | null
  /** 同じく平均 (外れ値を見るため median と両方持つ) */
  meanRatio: number | null
  /** medianRatio を 0.05 刻みで丸め [0.5, 3.0] に clamp。unknown なら null */
  calibrationFactor: number | null
  tendency: BiasTendency
  /** AI brief / toast / dashboard 共通の JA 1 行 summary */
  summary: string
}

const MIN_SAMPLES_FOR_TENDENCY = 3
const TOLERANCE_RATIO = 0.1
const ON_TRACK_DOMINANT = 0.6
const SKEW_DOMINANT = 0.5
const SKEW_OPPOSITE_CEILING = 0.2
const CAL_MIN = 0.5
const CAL_MAX = 3.0

export function computeEstimateBias(samples: readonly BiasSample[]): EstimateBiasReport {
  const totalCount = samples.length
  const withEstimate = samples.filter(
    (s) => typeof s.estimateMinutes === 'number' && s.estimateMinutes > 0,
  )
  const withEstimateCount = withEstimate.length

  let underCount = 0
  let onCount = 0
  let overCount = 0
  const ratios: number[] = []

  for (const s of withEstimate) {
    const est = s.estimateMinutes as number
    const tolerance = Math.max(1, Math.round(est * TOLERANCE_RATIO))
    const diff = s.actualMinutes - est
    if (diff < -tolerance) underCount += 1
    else if (diff > tolerance) overCount += 1
    else onCount += 1
    ratios.push(s.actualMinutes / est)
  }

  const medianRatio = median(ratios)
  const meanRatio = ratios.length === 0 ? null : ratios.reduce((a, b) => a + b, 0) / ratios.length

  const tendency = classifyTendency({ withEstimateCount, underCount, onCount, overCount })

  const calibrationFactor =
    tendency === 'unknown' || medianRatio === null
      ? null
      : clamp(roundToStep(medianRatio, 0.05), CAL_MIN, CAL_MAX)

  return {
    totalCount,
    withEstimateCount,
    underCount,
    onCount,
    overCount,
    medianRatio,
    meanRatio,
    calibrationFactor,
    tendency,
    summary: formatSummaryJa({
      tendency,
      withEstimateCount,
      totalCount,
      underCount,
      onCount,
      overCount,
      calibrationFactor,
    }),
  }
}

function classifyTendency(c: {
  withEstimateCount: number
  underCount: number
  onCount: number
  overCount: number
}): BiasTendency {
  if (c.withEstimateCount < MIN_SAMPLES_FOR_TENDENCY) return 'unknown'
  const onR = c.onCount / c.withEstimateCount
  const underR = c.underCount / c.withEstimateCount
  const overR = c.overCount / c.withEstimateCount
  if (onR >= ON_TRACK_DOMINANT) return 'on-track'
  if (overR >= SKEW_DOMINANT && underR < SKEW_OPPOSITE_CEILING) return 'underestimating'
  if (underR >= SKEW_DOMINANT && overR < SKEW_OPPOSITE_CEILING) return 'overestimating'
  return 'mixed'
}

function formatSummaryJa(c: {
  tendency: BiasTendency
  withEstimateCount: number
  totalCount: number
  underCount: number
  onCount: number
  overCount: number
  calibrationFactor: number | null
}): string {
  if (c.tendency === 'unknown') {
    return `見積データが少なく傾向を判定できません (${c.withEstimateCount}/${c.totalCount} 件)`
  }
  const cal = c.calibrationFactor !== null ? `${c.calibrationFactor.toFixed(2)}×` : '—'
  const onPct = pct(c.onCount, c.withEstimateCount)
  const overPct = pct(c.overCount, c.withEstimateCount)
  const underPct = pct(c.underCount, c.withEstimateCount)
  if (c.tendency === 'on-track') {
    return `見積精度は良好です (見積±10% 以内が ${onPct}%、${c.withEstimateCount} 件中)`
  }
  if (c.tendency === 'underestimating') {
    return `見積を ${cal} 過小評価しがち (超過 ${overPct}%、${c.withEstimateCount} 件中)`
  }
  if (c.tendency === 'overestimating') {
    return `見積を ${cal} 過大評価しがち (見積内 ${underPct}%、${c.withEstimateCount} 件中)`
  }
  return `見積精度にばらつき (中央値 ${cal}、${c.withEstimateCount} 件中)`
}

function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0
  return rateToPct(num / denom)
}

/**
 * iter519 ai-automation: BiasTendency → 短い JA chip label。
 * estimate-bias-insight.tsx の TENDENCY_LABEL を集約、Slack 通知 / SR aria-label /
 * AI prompt の chip 文言で再利用可能。
 */
const TENDENCY_LABEL_JA: Record<BiasTendency, string> = {
  'on-track': '見積精度 良好',
  underestimating: '見積を低く見積りがち',
  overestimating: '見積を高く見積りがち',
  mixed: '見積精度にばらつき',
  unknown: '見積データ 不足',
}

export function biasTendencyLabelJa(tendency: BiasTendency): string {
  return TENDENCY_LABEL_JA[tendency]
}

/**
 * iter519 ai-automation: BiasTendency → 5 段階 Severity 共通分類軸 bridge。
 * SeverityChip の tone bind / lib/widget/severity-bridges との整合用。
 *
 *   'on-track'        → 'ok'      (= 良好、緑)
 *   'underestimating' → 'warn'    (= 見積低い = 残業リスク、黄)
 *   'overestimating'  → 'info'    (= 見積高い = 余裕枠保持、青、軽微)
 *   'mixed'           → 'warn'    (= ばらつき、要観察)
 *   'unknown'         → 'muted'   (= データ不足、グレー)
 *
 * 設計意図:
 *   - underestimating は「実 actual がはみ出て残業」 = 即時影響あり = warn
 *   - overestimating は「buffer 取り過ぎで時間効率損失」 = 中期影響 = info
 *   - mixed は両方混在 = 学習対象 = warn
 */
const TENDENCY_SEVERITY: Record<BiasTendency, Severity> = {
  'on-track': 'ok',
  underestimating: 'warn',
  overestimating: 'info',
  mixed: 'warn',
  unknown: 'muted',
}

export function biasTendencySeverity(tendency: BiasTendency): Severity {
  return TENDENCY_SEVERITY[tendency]
}

/**
 * iter537 ai-automation: `Record<BiasTendency, number>` (見積精度 別件数) を
 * `Record<Severity, number>` (5 段 severity 別件数) に集約する pure helper。
 *
 * iter533/534/535/536 と同 pattern (= 5 ドメイン目)。caller は
 * `formatSeverityCountsJa(biasTendencyCountsToSeverityCounts(counts))` で 見積精度
 * 件数 (チーム内 member 別 / 期間別 等) を 1 行 severity サマリ として AI prompt /
 * Slack 通知 / dashboard summary に出せる。
 *
 * 各 tendency は TENDENCY_SEVERITY (iter519) で集約:
 *   on-track         → ok    (= 良好)
 *   underestimating  → warn  (= 見積低い = 残業リスク)
 *   mixed            → warn  (= ばらつき、要観察)
 *   overestimating   → info  (= buffer 余り、軽微)
 *   unknown          → muted (= データ不足)
 *
 * 集約後の合計件数は tendency 合計と一致 (集約だけで増減しない)。'danger' bucket には
 * 出ない (見積精度は致命的事象としては表現しない、まず行動 = warn が適切)。
 *
 * iter533/534/535/536/537 で priority / status / due-proximity / goal-health /
 * bias-tendency の 5 ドメインが counts → severity-counts bridge を持つ。
 */
// iter1689 refactor: iter1430 で extract した汎用 `aggregateCountsBySeverity` に委譲。
// iter1687 due-proximity / iter1688 goal-health に続く外部 file 追従 4 件目。
// 振る舞い不変: TENDENCY_SEVERITY (on-track→ok / underestimating→warn / overestimating→info /
// mixed→warn / unknown→muted) の domain mapping は本 file 責務、boilerplate (空 Record +
// inline tendency 配列 + for-loop + ?? 0) を 1 行委譲に縮約。inline `BiasTendency[]` 配列も
// `aggregateCountsBySeverity` が `Object.keys(counts)` で走査するため不要に。
export function biasTendencyCountsToSeverityCounts(
  counts: Record<BiasTendency, number>,
): Record<Severity, number> {
  return aggregateCountsBySeverity(counts, biasTendencySeverity)
}
