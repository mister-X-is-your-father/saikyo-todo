/**
 * iter367 ai-automation: 未完了 item の **description カバレッジ** を計算する pure
 * helper。
 *
 * iter349 due-date-coverage (= 期限) / iter352 dod-coverage (= 受入条件) と並ぶ
 * 「× 説明文」軸 substrate。description が未設定 = 「title だけで詳細不明 → 着手
 * 直前に都度確認が必要」 pattern。AI brief / pm-agent / dashboard widget が
 * 「説明文カバレッジ 60% — 未設定 4 件」を 1 関数で出せる。
 *
 * 仕様:
 *   - input: items 配列 ({doneAt, archivedAt, description} の structural subset)
 *   - 集計対象: doneAt == null && archivedAt == null
 *   - withDescription: description が non-empty 文字列 (空文字 / whitespace-only は無効)
 *   - withoutDescription: null/undefined/空/whitespace-only
 *   - total / coverageRate (total=0 → null)
 */

import { rateToPct } from '@/lib/format-rate'

import { bucketByPriorityWith, PRIORITY_ORDER, type PriorityKey } from './priority'

export interface DescriptionCoverageFields {
  doneAt: Date | string | null | undefined
  archivedAt: Date | string | null | undefined
  description: string | null | undefined
}

export interface DescriptionCoverageByPriorityFields extends DescriptionCoverageFields {
  priority: number | null | undefined
}

export interface DescriptionCoverageStats {
  total: number
  withDescription: number
  withoutDescription: number
  coverageRate: number | null
}

const EMPTY: DescriptionCoverageStats = {
  total: 0,
  withDescription: 0,
  withoutDescription: 0,
  coverageRate: null,
}

function isMeaningful(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0
}

export function computeDescriptionCoverage<T extends DescriptionCoverageFields>(
  items: readonly T[],
): DescriptionCoverageStats {
  let withDescription = 0
  let withoutDescription = 0
  for (const it of items) {
    if (it.doneAt) continue
    if (it.archivedAt) continue
    if (isMeaningful(it.description)) {
      withDescription += 1
    } else {
      withoutDescription += 1
    }
  }
  const total = withDescription + withoutDescription
  if (total === 0) return EMPTY
  return {
    total,
    withDescription,
    withoutDescription,
    coverageRate: withDescription / total,
  }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'説明文カバレッジ: 60% (3 / 5 件 — 未設定 2 件)'`
 *   `'説明文カバレッジ: 100% (5 / 5 件)'`
 *   `'説明文カバレッジ: 0% (0 / 5 件 — 全て未設定)'`
 *   `'未完了 0 件 (該当なし)'`
 */
export function formatDescriptionCoverageJa(stats: DescriptionCoverageStats): string {
  if (stats.total === 0 || stats.coverageRate === null) return '未完了 0 件 (該当なし)'
  const pct = rateToPct(stats.coverageRate)
  if (pct === 100) {
    return `説明文カバレッジ: 100% (${stats.withDescription} / ${stats.total} 件)`
  }
  if (pct === 0) {
    return `説明文カバレッジ: 0% (0 / ${stats.total} 件 — 全て未設定)`
  }
  return `説明文カバレッジ: ${pct}% (${stats.withDescription} / ${stats.total} 件 — 未設定 ${stats.withoutDescription} 件)`
}

/**
 * dashboard chip 配色用の tone bucket (due-date-coverage / dod-coverage と同閾値)。
 *  - >= 0.7 → 'good' (健全)
 *  - 0.3 ≤ rate < 0.7 → 'neutral'
 *  - < 0.3 → 'warn'
 *  - total=0 / coverageRate=null → 'neutral'
 */
export type DescriptionCoverageTone = 'good' | 'neutral' | 'warn'

export function descriptionCoverageTone(stats: DescriptionCoverageStats): DescriptionCoverageTone {
  if (stats.total === 0 || stats.coverageRate === null) return 'neutral'
  if (stats.coverageRate >= 0.7) return 'good'
  if (stats.coverageRate >= 0.3) return 'neutral'
  return 'warn'
}

/**
 * iter367 ai-automation: priority 別の description coverage 集計
 * (iter365 `bucketByPriorityWith` を活用、due-hit-rate / dod-coverage / due-date-coverage
 * の 3 兄弟 by-priority と同 shape)。
 */
export type DescriptionCoverageByPriority = Record<PriorityKey, DescriptionCoverageStats>

export function computeDescriptionCoverageByPriority<T extends DescriptionCoverageByPriorityFields>(
  items: readonly T[],
): DescriptionCoverageByPriority {
  return bucketByPriorityWith(items, (group) => computeDescriptionCoverage(group))
}

export function formatDescriptionCoverageByPriorityJa(
  byPriority: DescriptionCoverageByPriority,
): string {
  const parts: string[] = []
  for (const k of PRIORITY_ORDER) {
    const stats = byPriority[k]
    if (stats.total === 0 || stats.coverageRate === null) continue
    const pct = rateToPct(stats.coverageRate)
    parts.push(`P${k} ${pct}% (${stats.withDescription}/${stats.total})`)
  }
  if (parts.length === 0) return '未完了 0 件 (該当なし)'
  return `説明文カバレッジ: ${parts.join(' / ')}`
}
