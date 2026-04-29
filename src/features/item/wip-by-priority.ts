/**
 * iter354 ai-automation: 進行中 (WIP = work in progress) item の priority 分布を
 * 計算する pure helper。
 *
 * AI 朝 brief / pm-agent / dashboard widget が「WIP 5 件 (P1: 0 / P2: 1 / P3: 4)」
 * のような bias 検出 insight を出せる substrate。「高優先が止まっている / 低優先
 * ばかり進めている」を 1 関数で見抜く。
 *
 * 仕様:
 *   - input: items 配列 ({status, priority} の structural subset)
 *   - 集計対象: status === 'in_progress' の item のみ
 *   - 各 priority bucket は必ず初期化 (1, 2, 3, 4)、null/undefined/範囲外は p4 集約
 *   - total = 全 P 合計、各 bucket には件数
 *   - topPriority: 件数最大の priority key (tie は番号小さい方を優先 = 高優先優先)、
 *     total=0 → null
 */

import { normalizePriority, PRIORITY_ORDER, type PriorityKey } from './priority'

export interface WipByPriorityFields {
  status: string | null | undefined
  priority: number | null | undefined
}

export interface WipByPriorityStats {
  total: number
  byPriority: Record<PriorityKey, number>
  /** 件数最大の priority。tie で複数 priority が同点なら番号小さい方 (高優先) を返す。total=0 → null */
  topPriority: PriorityKey | null
}

const EMPTY: WipByPriorityStats = {
  total: 0,
  byPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
  topPriority: null,
}

export function computeWipByPriority<T extends WipByPriorityFields>(
  items: readonly T[],
): WipByPriorityStats {
  const byPriority: Record<PriorityKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  let total = 0
  for (const it of items) {
    if (it.status !== 'in_progress') continue
    byPriority[normalizePriority(it.priority)] += 1
    total += 1
  }
  if (total === 0) return EMPTY
  let topPriority: PriorityKey = 1
  let topCount = byPriority[1]
  for (const k of [2, 3, 4] as const) {
    if (byPriority[k] > topCount) {
      topPriority = k
      topCount = byPriority[k]
    }
  }
  return { total, byPriority, topPriority }
}

/**
 * AI prompt 用 1 行サマリ:
 *   `'WIP: 5 件 (P1: 0 / P2: 1 / P3: 4 / P4: 0)'`
 *   `'WIP: 3 件 (P3: 3)'` — 単一 priority に集中時は省略形 (= 0 件 priority を非表示)
 *   `'WIP 0 件'` — total=0
 */
export function formatWipByPriorityJa(stats: WipByPriorityStats): string {
  if (stats.total === 0) return 'WIP 0 件'
  const nonZero = PRIORITY_ORDER.filter((k) => stats.byPriority[k] > 0)
  if (nonZero.length === 1) {
    const k = nonZero[0]!
    return `WIP: ${stats.total} 件 (P${k}: ${stats.byPriority[k]})`
  }
  const parts = PRIORITY_ORDER.map((k) => `P${k}: ${stats.byPriority[k]}`)
  return `WIP: ${stats.total} 件 (${parts.join(' / ')})`
}

/**
 * iter354 ai-automation: 「高優先が止まっているか」を判定する糖衣。
 *
 * P1 + P2 (高優先合算) が 0 で、P3 + P4 (低優先合算) ≥ 1 → 'low-priority-only'。
 * 高優先が WIP に含まれる → 'has-high-priority'。total=0 → 'idle'。
 */
export type WipBiasKind = 'has-high-priority' | 'low-priority-only' | 'idle'

export function wipBiasKind(stats: WipByPriorityStats): WipBiasKind {
  if (stats.total === 0) return 'idle'
  const high = stats.byPriority[1] + stats.byPriority[2]
  if (high > 0) return 'has-high-priority'
  return 'low-priority-only'
}
