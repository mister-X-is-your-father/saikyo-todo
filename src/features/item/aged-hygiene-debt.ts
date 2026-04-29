/**
 * iter384 ai-automation: 「old + planning fields 全 unset」 item を「最も緊急度の
 * 高い triage 候補」として age × debt 軸で集計する combinator substrate。
 *
 * iter379 hygiene-debt (= title だけ items) と iter337 backlog-aging
 * (= createdAt 年齢バケット) を組合せて、「古いが計画化されていない」 stale
 * brain-dump を 1 関数で抽出する。
 *
 * AI 朝 brief / pm-agent / dashboard widget が:
 *   - 「30 日以上古い triage 候補が 3 件 (= 放置されている)」
 *   - 「stale brain-dump: 5 件 / うち ancient 2 件」
 * のような「単なる debt 件数」より一段絞り込んだ insight を出せる。
 *
 * 仕様:
 *   - input: items 配列 ({hygiene-debt fields} + {createdAt})
 *   - 内部で `pickHygieneDebtItems` で filter → `countItemsByAge` で age 集計
 *   - `oldestAgeDays`: debt items のうち最も古いものの ageDays (null = 0 件)
 */

import {
  type AgingGroups,
  type AgingKind,
  countItemsByAge,
  getItemAge,
  groupItemsByAge,
} from './backlog-aging'
import { type HygieneDebtFields, pickHygieneDebtItems } from './hygiene-debt'

export interface AgedHygieneDebtFields extends HygieneDebtFields {
  createdAt: Date | string | null | undefined
}

export interface AgedHygieneDebtStats {
  /** 全 debt items 件数 (= pickHygieneDebtItems の長さ) */
  totalDebt: number
  /** 年齢バケット別 件数 (debt items のみ) */
  byAge: Record<AgingKind, number>
  /** 最も古い debt item の ageDays (null = debt 0 件 / unknown 全部) */
  oldestAgeDays: number | null
  /** ancient (>= 30 日) + stale (7..30 日) の合算 = 「停滞 debt」 */
  stagnantDebtCount: number
}

const EMPTY_BY_AGE: Record<AgingKind, number> = {
  new: 0,
  recent: 0,
  stale: 0,
  ancient: 0,
  unknown: 0,
}

export function computeAgedHygieneDebt<T extends AgedHygieneDebtFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): AgedHygieneDebtStats {
  const debts = pickHygieneDebtItems(items)
  if (debts.length === 0) {
    return { totalDebt: 0, byAge: { ...EMPTY_BY_AGE }, oldestAgeDays: null, stagnantDebtCount: 0 }
  }
  const byAge = countItemsByAge(debts, today)
  let oldestAgeDays: number | null = null
  for (const it of debts) {
    const { ageDays } = getItemAge(it.createdAt, today)
    if (ageDays === undefined) continue
    if (oldestAgeDays === null || ageDays > oldestAgeDays) oldestAgeDays = ageDays
  }
  const stagnantDebtCount = byAge.ancient + byAge.stale
  return { totalDebt: debts.length, byAge, oldestAgeDays, stagnantDebtCount }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'停滞 Debt: 3 件 (古参 2 / 停滞 1) — 最古 45 日'`
 *   `'Debt: 5 件 / 全件新規 — 停滞無し'`
 *   `'未完了 Debt 0 件 (該当なし)'`
 */
export function formatAgedHygieneDebtJa(stats: AgedHygieneDebtStats): string {
  if (stats.totalDebt === 0) return '未完了 Debt 0 件 (該当なし)'
  const { byAge, stagnantDebtCount, oldestAgeDays } = stats
  if (stagnantDebtCount === 0) {
    return `Debt: ${stats.totalDebt} 件 / 全件新規 — 停滞無し`
  }
  const parts: string[] = []
  if (byAge.ancient > 0) parts.push(`古参 ${byAge.ancient}`)
  if (byAge.stale > 0) parts.push(`停滞 ${byAge.stale}`)
  const oldest = oldestAgeDays !== null ? ` — 最古 ${oldestAgeDays} 日` : ''
  return `停滞 Debt: ${stagnantDebtCount} 件 (${parts.join(' / ')})${oldest}`
}

/**
 * 「停滞 debt」(= ancient + stale 軸の debt items) のみを stable 順序で返す薄い filter。
 * Dashboard hover や AI brief で「具体的にどの古い title-only item?」を出す用。
 */
export function pickStagnantDebtItems<T extends AgedHygieneDebtFields>(
  items: readonly T[],
  today: Date | string = new Date(),
): T[] {
  const debts = pickHygieneDebtItems(items)
  if (debts.length === 0) return []
  const groups: AgingGroups<T> = groupItemsByAge(debts, today)
  return [...groups.ancient, ...groups.stale]
}
