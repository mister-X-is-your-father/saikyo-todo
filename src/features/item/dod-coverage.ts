/**
 * iter352 ai-automation: 未完了 item の **DoD (Definition of Done) カバレッジ** を
 * 計算する pure helper。
 *
 * iter349 due-date-coverage (= 期限が決まっているか) と対称な「受入条件が決まって
 * いるか」substrate。DoD 未設定は「完了基準が曖昧 = 実装範囲が膨らみやすい」とみなして
 * planning hygiene metric として扱う。AI 朝 brief / pm-agent / dashboard widget が
 * 「DoD カバレッジ 60% — 未設定 4 件」を 1 関数で出せる。
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, archivedAt, dod} の structural subset)
 *   - 集計対象: doneAt == null && archivedAt == null (= 未完了 + 未 archive)
 *   - withDod: dod が non-empty 文字列 (空文字 / whitespace-only は無効扱い)
 *   - withoutDod: dod が null/undefined/空/whitespace-only
 *   - total = withDod + withoutDod
 *   - coverageRate = withDod / total (total=0 → null)
 */

import { bucketByPriorityWith, type PriorityKey } from './priority'

export interface DodCoverageFields {
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  dod: string | null | undefined
}

export interface DodCoverageByPriorityFields extends DodCoverageFields {
  priority: number | null | undefined
}

export interface DodCoverageStats {
  total: number
  withDod: number
  withoutDod: number
  /** 0..1 の少数。total=0 → null */
  coverageRate: number | null
}

const EMPTY: DodCoverageStats = {
  total: 0,
  withDod: 0,
  withoutDod: 0,
  coverageRate: null,
}

function isMeaningfulDod(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0
}

export function computeDodCoverage<T extends DodCoverageFields>(
  items: readonly T[],
): DodCoverageStats {
  let withDod = 0
  let withoutDod = 0
  for (const it of items) {
    if (it.doneAt) continue
    if (it.archivedAt) continue
    if (isMeaningfulDod(it.dod)) {
      withDod += 1
    } else {
      withoutDod += 1
    }
  }
  const total = withDod + withoutDod
  if (total === 0) return EMPTY
  return { total, withDod, withoutDod, coverageRate: withDod / total }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'DoD カバレッジ: 60% (3 / 5 件 — 未設定 2 件)'`
 *   `'DoD カバレッジ: 100% (5 / 5 件)'`
 *   `'DoD カバレッジ: 0% (0 / 5 件 — 全て未設定)'`
 *   `'未完了 0 件 (該当なし)'`
 */
export function formatDodCoverageJa(stats: DodCoverageStats): string {
  if (stats.total === 0 || stats.coverageRate === null) return '未完了 0 件 (該当なし)'
  const pct = Math.round(stats.coverageRate * 100)
  if (pct === 100) {
    return `DoD カバレッジ: 100% (${stats.withDod} / ${stats.total} 件)`
  }
  if (pct === 0) {
    return `DoD カバレッジ: 0% (0 / ${stats.total} 件 — 全て未設定)`
  }
  return `DoD カバレッジ: ${pct}% (${stats.withDod} / ${stats.total} 件 — 未設定 ${stats.withoutDod} 件)`
}

/**
 * iter362 ai-automation: priority 別の `DodCoverageStats` を計算する pure helper。
 *
 * iter344 (`computeDueHitRateByPriority`) と対称。「P1 DoD 100% / P3 DoD 50%」の
 * ように priority 別に受入条件のカバレッジを出し、AI brief / pm-agent /
 * dashboard widget で「低優先 ほど DoD 未設定 = scope 曖昧」 bias を検出可能に。
 */
export type DodCoverageByPriority = Record<PriorityKey, DodCoverageStats>

export function computeDodCoverageByPriority<T extends DodCoverageByPriorityFields>(
  items: readonly T[],
): DodCoverageByPriority {
  return bucketByPriorityWith(items, (group) => computeDodCoverage(group))
}

/**
 * AI prompt 用 1 行サマリ (priority 別):
 *   `'DoD カバレッジ: P1 100% (3/3) / P2 80% (4/5) / P4 50% (1/2)'`
 *
 * total=0 の priority は省略。全 priority が total=0 → `'未完了 0 件 (該当なし)'`。
 */
export function formatDodCoverageByPriorityJa(byPriority: DodCoverageByPriority): string {
  const parts: string[] = []
  for (const k of [1, 2, 3, 4] as const) {
    const stats = byPriority[k]
    if (stats.total === 0 || stats.coverageRate === null) continue
    const pct = Math.round(stats.coverageRate * 100)
    parts.push(`P${k} ${pct}% (${stats.withDod}/${stats.total})`)
  }
  if (parts.length === 0) return '未完了 0 件 (該当なし)'
  return `DoD カバレッジ: ${parts.join(' / ')}`
}

/**
 * dashboard chip 配色用の tone bucket (due-date-coverage と同じ閾値)。
 *  - >= 0.7 → 'good' (受入条件が概ね揃っている)
 *  - 0.3 ≤ rate < 0.7 → 'neutral' (中立)
 *  - < 0.3 → 'warn' (DoD 未設定が多 = scope 曖昧)
 *  - total=0 / coverageRate=null → 'neutral'
 */
export type DodCoverageTone = 'good' | 'neutral' | 'warn'

export function dodCoverageTone(stats: DodCoverageStats): DodCoverageTone {
  if (stats.total === 0 || stats.coverageRate === null) return 'neutral'
  if (stats.coverageRate >= 0.7) return 'good'
  if (stats.coverageRate >= 0.3) return 'neutral'
  return 'warn'
}
