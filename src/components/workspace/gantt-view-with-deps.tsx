'use client'

/**
 * GanttView の wrapper Client Component (Phase 6.15 iter 8)。
 *
 * - `useWorkspaceBlocksDependencies(workspaceId)` で type='blocks' edges を取得
 * - items + edges から `computeCriticalPath` で criticalPathIds を計算
 *   (各 item の duration = dueDate - startDate + 1 日。日付未設定は除外)
 * - 結果を `GanttView` に edges / criticalIds で渡す
 *
 * 純粋プレゼンテーション (GanttView) と Hook 配線 (本 component) を分離することで、
 * GanttView 単体の test / Storybook 可能性を維持。
 */
import { useMemo } from 'react'

import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'

import { computeCriticalPath, type CpmEdge, type CpmItem } from '@/features/gantt/critical-path'
import type { Item } from '@/features/item/schema'
import { useWorkspaceBlocksDependencies } from '@/features/item-dependency/hooks'

import { GanttView } from './gantt-view'

interface Props {
  workspaceId: string
  items: Item[]
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? d : null
}

export function GanttViewWithDeps({ workspaceId, items }: Props) {
  const { data: edges = [] } = useWorkspaceBlocksDependencies(workspaceId)

  const criticalIds = useMemo(() => {
    // 期間が引ける item だけを CPM 入力にする (duration = dueDate - startDate + 1)
    const cpmItems: CpmItem[] = []
    const validIds = new Set<string>()
    for (const i of items) {
      if (i.deletedAt) continue
      const start = toDate(i.startDate)
      const due = toDate(i.dueDate)
      if (!start || !due) continue
      const durationDays = Math.max(0, differenceInCalendarDays(due, start) + 1)
      cpmItems.push({ id: i.id, durationDays })
      validIds.add(i.id)
    }
    // 両端が有効な edges のみ採用 (CPM の UNKNOWN_DEPENDENCY_NODE を避ける)
    // CpmEdge は (fromId, toId) — DB 列名 (fromItemId, toItemId) と異なるため map で変換
    const cpmEdges: CpmEdge[] = edges
      .filter((e) => validIds.has(e.fromItemId) && validIds.has(e.toItemId))
      .map((e) => ({ fromId: e.fromItemId, toId: e.toItemId }))
    const r = computeCriticalPath(cpmItems, cpmEdges)
    if (!r.ok) return [] // 循環等で失敗したら critical 強調無し (silent)
    return r.value.criticalPathIds
  }, [items, edges])

  return (
    <GanttView workspaceId={workspaceId} items={items} edges={edges} criticalIds={criticalIds} />
  )
}
