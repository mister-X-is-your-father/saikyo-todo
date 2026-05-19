/**
 * iter374 ai-automation: 「Planning hygiene が一番弱い priority」を 1 つに絞り込む
 * 焦点抽出 combinator。iter372 で priority 別 hygiene score (CombinedHygieneByPriority)
 * を整備済、本 iter は「では今どこから手をつければいいか?」の 1 行 actionable signal
 * を出す substrate。
 *
 * 用途:
 *   - AI 朝 brief: `'今日の重点: P1 Hygiene 30 (重要 item の planning 漏れ多)'`
 *   - pm-agent: 「最弱 P1 (Hygiene 25) を最優先で計画化」
 *   - dashboard widget: 強調 chip 1 個に絞り込んで attention を集中
 *
 * 仕様:
 *   - input: CombinedHygieneByPriority (iter372)
 *   - 集計対象: score !== null (= 未完了 item があった priority のみ)
 *   - 同 score 同点 → priority 数値が小さい (= P1 寄り) を優先 (重要度高い順)
 *   - 全 priority が空 → null
 *   - tone は `combinedHygieneTone` と同 3 値 ('warn' / 'neutral' / 'good')
 */

import { type CombinedHygieneTone, combinedHygieneTone } from './combined-hygiene'
import type { CombinedHygieneByPriority } from './combined-hygiene-by-priority'
import { PRIORITY_ORDER, type PriorityKey } from './priority'

export interface HygieneFocus {
  /** 一番 score が低かった priority */
  priority: PriorityKey
  /** その priority の Hygiene Score (0..100 整数) */
  score: number
  /** combinedHygieneTone と同 3 値 */
  tone: CombinedHygieneTone
  /** 集計に貢献した軸数 (1..3、0 は除外済) */
  eligibleAxes: number
}

export function pickWeakestHygienePriority(
  byPriority: CombinedHygieneByPriority,
): HygieneFocus | null {
  let best: HygieneFocus | null = null
  for (const k of PRIORITY_ORDER) {
    const s = byPriority[k]
    if (s.score === null || s.eligibleAxes === 0) continue
    // 同 score 同点 → priority 数値小 (= 重要度高) を優先 → strict less than で更新
    if (best === null || s.score < best.score) {
      best = {
        priority: k,
        score: s.score,
        tone: combinedHygieneTone(s),
        eligibleAxes: s.eligibleAxes,
      }
    }
  }
  return best
}

/**
 * AI prompt 用 1 行サマリ:
 *   - 'warn' (score < 30):  `'要注意: P1 Hygiene 25 — planning 漏れ多、計画化推奨'`
 *   - 'neutral' (30..70):   `'重点: P1 Hygiene 50 — 計画化余地あり'`
 *   - 'good' (>= 70):       `'良好: P1 Hygiene 80'`
 *   - null:                 `'未完了 0 件 (該当なし)'`
 */
export function formatHygieneFocusJa(focus: HygieneFocus | null): string {
  if (focus === null) return '未完了 0 件 (該当なし)'
  const head = focus.tone === 'warn' ? '要注意' : focus.tone === 'neutral' ? '重点' : '良好'
  const suffix =
    focus.tone === 'warn'
      ? ' — planning 漏れ多、計画化推奨'
      : focus.tone === 'neutral'
        ? ' — 計画化余地あり'
        : ''
  return `${head}: P${focus.priority} Hygiene ${focus.score}${suffix}`
}

/**
 * iter1020 refactor: pickWeakestHygienePriority と対称な「最強 (= 最高 score) priority」 抽出。
 *
 * iter1017 `pickStrongestHygieneAxis` (= 3 軸の最強) と並ぶ「最強 priority」 pattern。
 * dashboard / AI brief で「強み + 弱み」 を bi-directional に出すための pair helper。
 *
 * 仕様 (pickWeakestHygienePriority と対称):
 *   - 集計対象: score !== null + eligibleAxes > 0
 *   - 同 score 同点 → priority 数値が小さい (= P1 寄り = 重要度高い) を優先 → strict greater than
 *   - 全 priority が空 → null
 */
export function pickStrongestHygienePriority(
  byPriority: CombinedHygieneByPriority,
): HygieneFocus | null {
  let best: HygieneFocus | null = null
  for (const k of PRIORITY_ORDER) {
    const s = byPriority[k]
    if (s.score === null || s.eligibleAxes === 0) continue
    if (best === null || s.score > best.score) {
      best = {
        priority: k,
        score: s.score,
        tone: combinedHygieneTone(s),
        eligibleAxes: s.eligibleAxes,
      }
    }
  }
  return best
}
