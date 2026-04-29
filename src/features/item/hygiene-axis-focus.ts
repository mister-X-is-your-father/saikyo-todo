/**
 * iter377 ai-automation: 「Planning hygiene 3 軸 (期限 / DoD / 説明文) のうち
 * 一番弱い軸」を抽出する pure helper。iter374 hygiene-focus の対称軸 (= priority
 * 別の最弱) に対して、本 helper は「軸別の最弱」を出す。両者を組合せれば
 * 「P1 の説明文 が一番弱い」のような 2D drill-down が成立する。
 *
 * 用途:
 *   - AI 朝 brief: `'重点軸: 説明文 50% — まず説明文の充実から'`
 *   - pm-agent: 「説明文軸が一番弱い → 説明文テンプレ提案」
 *   - dashboard: 既存 chip の上 / 下に「重点軸」 chip 補完
 *
 * 仕様:
 *   - input: CombinedHygieneScore (iter369)
 *   - 集計対象: rate !== null (= 該当 item があった軸のみ)
 *   - 同 rate 同点 → axis 順序 (dueDate < dod < description) を優先 (= 着手の
 *     依存順、planning hygiene の自然な改善順序)
 *   - 全軸 null → null
 */

import type { CombinedHygieneScore } from './combined-hygiene'

export type HygieneAxis = 'dueDate' | 'dod' | 'description'

const HYGIENE_AXIS_LABEL: Record<HygieneAxis, string> = {
  dueDate: '期限',
  dod: 'DoD',
  description: '説明文',
}

/** axis を「着手の依存順」で並べた 1 source of truth (tie-break / iteration 順序の規範) */
export const HYGIENE_AXIS_ORDER: readonly HygieneAxis[] = ['dueDate', 'dod', 'description'] as const

export interface HygieneAxisFocus {
  axis: HygieneAxis
  /** 0..1 の rate (null は除外済) */
  rate: number
  /** 0..100 整数 */
  pct: number
  /** 日本語 label ('期限' / 'DoD' / '説明文') */
  label: string
}

export function pickWeakestHygieneAxis(score: CombinedHygieneScore): HygieneAxisFocus | null {
  let best: HygieneAxisFocus | null = null
  for (const axis of HYGIENE_AXIS_ORDER) {
    const rate =
      axis === 'dueDate'
        ? score.dueDateRate
        : axis === 'dod'
          ? score.dodRate
          : score.descriptionRate
    if (rate === null) continue
    // 同 rate 同点 → axis 順序 (= 着手依存順、stable iteration) を優先 → strict less than
    if (best === null || rate < best.rate) {
      best = {
        axis,
        rate,
        pct: Math.round(rate * 100),
        label: HYGIENE_AXIS_LABEL[axis],
      }
    }
  }
  return best
}

/**
 * AI prompt 用 1 行サマリ:
 *   - rate < 0.3:   `'重点軸: 説明文 25% — まず説明文の充実から'`
 *   - 0.3..0.7:     `'重点軸: 説明文 50% — 改善余地あり'`
 *   - rate >= 0.7:  `'重点軸: 説明文 80% (全軸良好)'`
 *   - null:         `'未完了 0 件 (該当なし)'`
 */
export function formatHygieneAxisFocusJa(focus: HygieneAxisFocus | null): string {
  if (focus === null) return '未完了 0 件 (該当なし)'
  if (focus.rate < 0.3) return `重点軸: ${focus.label} ${focus.pct}% — まず${focus.label}の充実から`
  if (focus.rate < 0.7) return `重点軸: ${focus.label} ${focus.pct}% — 改善余地あり`
  return `重点軸: ${focus.label} ${focus.pct}% (全軸良好)`
}
