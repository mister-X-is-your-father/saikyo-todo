/**
 * iter372 ai-automation: 「planning hygiene 統合 score」 (iter369) を **priority 別**
 * に集計する pure helper。iter344 due-hit-rate / iter362 dod-coverage /
 * iter364 due-date-coverage と同じ「× priority」軸を combined hygiene にも
 * 揃える 4 弾目。
 *
 * AI 朝 brief / pm-agent / dashboard widget が「P1 Hygiene 30 — 高優先タスクの
 * 計画化漏れ」のような **優先度別の planning hygiene 弱点** を 1 関数で取り出せる。
 * 全体 score は健全に見えても P1 だけ低い (= 重要 item 群の planning 漏れ) という
 * 隠れた pattern を露出させる substrate。
 *
 * 仕様:
 *   - input: items 配列 (`CombinedHygieneByPriorityFields` = 3 substrate fields の union)
 *   - 出力: `Record<PriorityKey, CombinedHygieneScore>` (各 P bucket 必ず初期化)
 *   - 内部で 3 既存 by-priority helper の結果を `combineHygieneScore` に流し込み
 *   - `formatCombinedHygieneByPriorityJa` で 1 行 summary
 */

import { type CombinedHygieneScore, combineHygieneScore } from './combined-hygiene'
import {
  computeDescriptionCoverageByPriority,
  type DescriptionCoverageByPriorityFields,
} from './description-coverage'
import { computeDodCoverageByPriority, type DodCoverageByPriorityFields } from './dod-coverage'
import {
  computeDueDateCoverageByPriority,
  type DueDateCoverageByPriorityFields,
} from './due-date-coverage'
import type { PriorityKey } from './priority'

export interface CombinedHygieneByPriorityFields
  extends
    DueDateCoverageByPriorityFields,
    DodCoverageByPriorityFields,
    DescriptionCoverageByPriorityFields {}

export type CombinedHygieneByPriority = Record<PriorityKey, CombinedHygieneScore>

export function computeCombinedHygieneByPriority<T extends CombinedHygieneByPriorityFields>(
  items: readonly T[],
): CombinedHygieneByPriority {
  const dueDate = computeDueDateCoverageByPriority(items)
  const dod = computeDodCoverageByPriority(items)
  const description = computeDescriptionCoverageByPriority(items)
  return {
    1: combineHygieneScore({ dueDate: dueDate[1], dod: dod[1], description: description[1] }),
    2: combineHygieneScore({ dueDate: dueDate[2], dod: dod[2], description: description[2] }),
    3: combineHygieneScore({ dueDate: dueDate[3], dod: dod[3], description: description[3] }),
    4: combineHygieneScore({ dueDate: dueDate[4], dod: dod[4], description: description[4] }),
  }
}

/**
 * AI prompt 用 1 行 summary (priority 別):
 *   `'Planning Hygiene: P1 30 / P2 70 / P3 80'`
 *
 * eligibleAxes=0 (= 未完了 0 件) の priority は省略。全 priority が空 →
 * `'未完了 0 件 (該当なし)'`。
 */
export function formatCombinedHygieneByPriorityJa(byPriority: CombinedHygieneByPriority): string {
  const parts: string[] = []
  for (const k of [1, 2, 3, 4] as const) {
    const s = byPriority[k]
    if (s.score === null || s.eligibleAxes === 0) continue
    parts.push(`P${k} ${s.score}`)
  }
  if (parts.length === 0) return '未完了 0 件 (該当なし)'
  return `Planning Hygiene: ${parts.join(' / ')}`
}
