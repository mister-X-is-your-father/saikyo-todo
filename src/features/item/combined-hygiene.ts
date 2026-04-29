/**
 * iter369 ai-automation: 「planning hygiene 3 兄弟」 (期限 / DoD / 説明文 カバレッジ)
 * を 1 つの **総合 score** に統合する pure helper。
 *
 * iter349 due-date-coverage / iter352 dod-coverage / iter367 description-coverage
 * を組み合わせて 0..100 の Hygiene Score を出し、AI 朝 brief / pm-agent /
 * dashboard widget が「Planning Hygiene 70 (期限 80% / DoD 60% / 説明文 70%)」の
 * ような単一 KPI として扱えるように。3 chip を独立に見るより「全体としての健全度」
 * を一望できる combinator。
 *
 * 仕様:
 *   - input: 既存 stats 3 つ (DueDateCoverageStats / DodCoverageStats /
 *     DescriptionCoverageStats)
 *   - 出力: `{score, dueDateRate, dodRate, descriptionRate, eligibleAxes}`
 *   - score: 3 軸の coverageRate を **眾合 (= 値が null でない軸だけ avg)**、0..100 整数
 *   - eligibleAxes: 集計に貢献した軸数 (= total > 0 の軸数、0..3)
 *   - 全 3 軸 total=0 → score=null (= 未完了 0 件)
 */

import type { DescriptionCoverageStats } from './description-coverage'
import type { DodCoverageStats } from './dod-coverage'
import type { DueDateCoverageStats } from './due-date-coverage'

export interface CombinedHygieneInput {
  dueDate: DueDateCoverageStats
  dod: DodCoverageStats
  description: DescriptionCoverageStats
}

export interface CombinedHygieneScore {
  /** 0..100 整数。集計対象が 0 軸 → null */
  score: number | null
  /** 各軸の coverageRate (0..1)、null は集計対象外を意味する */
  dueDateRate: number | null
  dodRate: number | null
  descriptionRate: number | null
  /** total > 0 だった軸数 (0..3) */
  eligibleAxes: number
}

export function combineHygieneScore(input: CombinedHygieneInput): CombinedHygieneScore {
  const dueDateRate = input.dueDate.coverageRate
  const dodRate = input.dod.coverageRate
  const descriptionRate = input.description.coverageRate

  const rates: number[] = []
  if (dueDateRate !== null) rates.push(dueDateRate)
  if (dodRate !== null) rates.push(dodRate)
  if (descriptionRate !== null) rates.push(descriptionRate)

  if (rates.length === 0) {
    return {
      score: null,
      dueDateRate,
      dodRate,
      descriptionRate,
      eligibleAxes: 0,
    }
  }

  const avg = rates.reduce((s, v) => s + v, 0) / rates.length
  return {
    score: Math.round(avg * 100),
    dueDateRate,
    dodRate,
    descriptionRate,
    eligibleAxes: rates.length,
  }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'Planning Hygiene: 70 (期限 80% / DoD 60% / 説明文 70%)'`
 *   `'Planning Hygiene: 50 (期限 50% / 説明文 50%)'` (= 一部軸 null)
 *   `'Planning Hygiene 0 件 (該当なし)'` (= 全軸 null)
 */
export function formatCombinedHygieneJa(score: CombinedHygieneScore): string {
  if (score.score === null || score.eligibleAxes === 0) {
    return 'Planning Hygiene 0 件 (該当なし)'
  }
  const parts: string[] = []
  if (score.dueDateRate !== null) parts.push(`期限 ${Math.round(score.dueDateRate * 100)}%`)
  if (score.dodRate !== null) parts.push(`DoD ${Math.round(score.dodRate * 100)}%`)
  if (score.descriptionRate !== null) {
    parts.push(`説明文 ${Math.round(score.descriptionRate * 100)}%`)
  }
  return `Planning Hygiene: ${score.score} (${parts.join(' / ')})`
}

/**
 * dashboard chip 配色用の tone bucket (各軸の coverage tone と同閾値)。
 *  - score >= 70 → 'good'
 *  - 30 ≤ score < 70 → 'neutral'
 *  - < 30 → 'warn'
 *  - score=null → 'neutral' (= 集計対象なし、empty)
 */
export type CombinedHygieneTone = 'good' | 'neutral' | 'warn'

export function combinedHygieneTone(score: CombinedHygieneScore): CombinedHygieneTone {
  if (score.score === null) return 'neutral'
  if (score.score >= 70) return 'good'
  if (score.score >= 30) return 'neutral'
  return 'warn'
}
