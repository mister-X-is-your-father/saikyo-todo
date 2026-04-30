/**
 * iter474: itemAssignees の row 配列を `itemId → AssigneeRef[]` の Record に
 * group 化する pure helper。bulk fetch (sprint swim-lane / member-capacity 用)
 * の post-processing。Service / hook の両方から再利用、test deterministic。
 *
 * 入力順を保持 (= caller が ORDER BY を効かせれば assignee 表示順が DB と一致)。
 * itemId 重複 row は同 list に積む、空 input は空 record。
 */
import type { AssigneeRef } from './repository'

export interface AssigneeRow extends AssigneeRef {
  itemId: string
}

export function groupAssigneesByItemId(
  rows: ReadonlyArray<AssigneeRow>,
): Record<string, AssigneeRef[]> {
  const out: Record<string, AssigneeRef[]> = {}
  for (const r of rows) {
    const list = out[r.itemId] ?? []
    list.push({ actorType: r.actorType, actorId: r.actorId })
    out[r.itemId] = list
  }
  return out
}
