/**
 * iter1418 (queue Gantt DnD 期間編集 scope C substrate): Shift+drag で「前提/後続を
 * まるまる shift」 する依存連動の pure core。
 *
 * 設計目的 (FEEDBACK_QUEUE.md Gantt DnD scope C):
 *   - bar-drag.ts (scope A 中央 / scope B edge resize) は単一 bar のみ動かす。
 *   - scope C は「Shift+drag で 後続 (transitive closure) もまとめて同じ deltaDays で shift」。
 *   - 本 helper は (1) root から後続の transitive closure を求める graph traversal と、
 *     (2) closure の各 item に shiftIsoDate を適用して新 date を返す plan の 2 段。
 *
 * 依存の向き (critical-path CpmEdge と同一):
 *   fromId (前提/上流) → toId (後続/下流)。root を後ろにずらすと、root に依存する
 *   後続 (= root が fromId の toId 群) も連動して後ろにずれる。
 *
 * cycle-safe (visited で再訪防止)、dedup、BFS 順 (root → 近い後続 → 遠い後続)。
 * 副作用無し・AI 不使用。pure helper + Vitest 単体で網羅。
 */
import { shiftIsoDate } from '@/lib/date/iso'

import type { CpmEdge } from './critical-path'

/**
 * rootId から fromId→toId を辿った transitive closure (root 含む) を BFS 順で返す。
 * cycle があっても visited で停止、重複は除外。
 */
export function computeTransitiveSuccessors(rootId: string, edges: readonly CpmEdge[]): string[] {
  // 隣接リスト fromId → toId[]
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    const list = adj.get(e.fromId)
    if (list) list.push(e.toId)
    else adj.set(e.fromId, [e.toId])
  }

  const visited = new Set<string>([rootId])
  const order: string[] = [rootId]
  const queue: string[] = [rootId]

  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const next of adj.get(cur) ?? []) {
      if (visited.has(next)) continue
      visited.add(next)
      order.push(next)
      queue.push(next)
    }
  }

  return order
}

export interface ShiftableItem {
  id: string
  startDate: string | null
  dueDate: string | null
}

export interface ShiftedItem {
  id: string
  startDate: string | null
  dueDate: string | null
}

/**
 * root + 後続 closure の各 item の startDate / dueDate を deltaDays 平行 shift した
 * 結果を返す。closure に含まれない / items に存在しない id は対象外。
 * deltaDays === 0 は no-op で空配列 (mutation 不要)。null date はそのまま null。
 */
export function planDependencyShift(
  items: readonly ShiftableItem[],
  rootId: string,
  edges: readonly CpmEdge[],
  deltaDays: number,
): ShiftedItem[] {
  if (deltaDays === 0) return []

  const affected = new Set(computeTransitiveSuccessors(rootId, edges))
  const result: ShiftedItem[] = []
  for (const it of items) {
    if (!affected.has(it.id)) continue
    result.push({
      id: it.id,
      startDate: it.startDate === null ? null : shiftIsoDate(it.startDate, deltaDays),
      dueDate: it.dueDate === null ? null : shiftIsoDate(it.dueDate, deltaDays),
    })
  }
  return result
}
