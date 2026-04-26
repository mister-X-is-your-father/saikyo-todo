'use client'

/**
 * Gantt View。MVP は棒のみ実装、Phase 6.15 iter 6 で **依存線 SVG オーバーレイ** を統合。
 *
 * 自作理由: gantt-task-react は peerDeps が React 18 固定。React 19 の pnpm strict peer
 * で install できない。MVP は "棒のみ" なので SVG 不要、div + Tailwind で十分。
 *
 * 入力: startDate + dueDate を持つ item のみ bar 化。どちらか欠けたら表示はするが bar なし。
 *
 * 座標系:
 *   - timeline range: min(startDate) .. max(dueDate) + 1日 (両端に余白)
 *   - 1 day = 40px 固定
 *   - bar left = (startDate - rangeStart) * dayWidth
 *   - bar width = (dueDate - startDate + 1) * dayWidth
 *
 * 依存線 (Phase 6.15 iter 2 で component 化、iter 6 で配線):
 *   - props.edges に Phase 6.10 item_dependencies (type='blocks') を fromId/toId で渡すと
 *     Manhattan L 字パスで矢印描画。両端 bar が isCritical なら赤実線
 *   - props.criticalIds に critical path 上の itemId を渡すと bar が isCritical 扱い
 *     (Phase 6.15 iter 1 の computeCriticalPath を呼んだ結果を渡す想定)
 *   - workspace 横断 edges 取得 hook は次 iter (現状は呼び出し元から渡す)
 */
import { useMemo } from 'react'

import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'

import type { Item } from '@/features/item/schema'

import { type GanttBar, type GanttDepEdge, GanttDependencyArrows } from './gantt-dependency-arrows'

interface Props {
  workspaceId: string
  items: Item[]
  /** Phase 6.10 item_dependencies の type='blocks' edges (workspace 横断) */
  edges?: GanttDepEdge[]
  /** Phase 6.15 iter 1 computeCriticalPath の criticalPathIds */
  criticalIds?: string[]
}

const DAY_PX = 40
const ROW_PX = 32
const HEADER_PX = 32
const LABEL_COL_PX = 240

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? d : null
}

export function GanttView({
  items,
  edges = [],
  criticalIds = [],
}: Omit<Props, 'workspaceId'> & { workspaceId?: string }) {
  const active = useMemo(() => items.filter((i) => !i.deletedAt), [items])
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds])

  const withDates = useMemo(
    () =>
      active
        .map((i) => ({
          item: i,
          start: toDate(i.startDate),
          due: toDate(i.dueDate),
        }))
        .filter((x) => x.start && x.due) as {
        item: Item
        start: Date
        due: Date
      }[],
    [active],
  )

  const range = useMemo(() => {
    if (withDates.length === 0) return null
    let min = withDates[0]!.start
    let max = withDates[0]!.due
    for (const x of withDates) {
      if (x.start < min) min = x.start
      if (x.due > max) max = x.due
    }
    // 両端 1 日ずつ余白
    return { start: addDays(min, -1), end: addDays(max, 1) }
  }, [withDates])

  if (withDates.length === 0) {
    return (
      <div data-testid="gantt-view" className="rounded-lg border p-6">
        <p className="text-muted-foreground text-center text-sm">
          startDate / dueDate が両方設定された item がありません。 Item 編集で期間を入れると Gantt
          に表示されます。
        </p>
      </div>
    )
  }

  const totalDays = differenceInCalendarDays(range!.end, range!.start) + 1
  const timelineWidth = totalDays * DAY_PX
  const days: Date[] = []
  for (let i = 0; i < totalDays; i++) days.push(addDays(range!.start, i))

  // 行の Y 位置 = HEADER_PX + index * ROW_PX、bar は top:1 + (ROW_PX - 8)/2 が中央
  const ganttBars: GanttBar[] = withDates.map((x, idx) => {
    const leftDays = differenceInCalendarDays(x.start, range!.start)
    const spanDays = differenceInCalendarDays(x.due, x.start) + 1
    const barLeft = leftDays * DAY_PX
    const barWidth = spanDays * DAY_PX
    return {
      id: x.item.id,
      leftPx: barLeft,
      rightPx: barLeft + barWidth,
      centerYPx: HEADER_PX + idx * ROW_PX + ROW_PX / 2,
      isCritical: criticalSet.has(x.item.id),
    }
  })

  const totalHeight = HEADER_PX + withDates.length * ROW_PX

  return (
    <div data-testid="gantt-view" className="overflow-auto rounded-lg border">
      <div style={{ width: LABEL_COL_PX + timelineWidth, position: 'relative' }}>
        {/* 依存線 SVG オーバーレイ (Phase 6.15 iter 2 の component を iter 6 で配線) */}
        {edges.length > 0 && (
          <GanttDependencyArrows
            width={timelineWidth}
            height={totalHeight}
            bars={ganttBars}
            edges={edges}
            offsetLeftPx={LABEL_COL_PX}
          />
        )}
        {/* Header */}
        <div className="bg-muted sticky top-0 z-10 flex border-b" style={{ height: HEADER_PX }}>
          <div
            className="shrink-0 border-r px-3 py-2 text-sm font-semibold"
            style={{ width: LABEL_COL_PX }}
          >
            Item
          </div>
          <div style={{ width: timelineWidth }} className="flex">
            {days.map((d, i) => (
              <div
                key={i}
                style={{ width: DAY_PX }}
                className="text-muted-foreground shrink-0 border-r px-1 text-center text-xs"
              >
                {format(d, 'M/d')}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {withDates.map(({ item, start, due }) => {
          const leftDays = differenceInCalendarDays(start, range!.start)
          const spanDays = differenceInCalendarDays(due, start) + 1
          const barLeft = leftDays * DAY_PX
          const barWidth = spanDays * DAY_PX
          return (
            <div
              key={item.id}
              data-testid={`gantt-row-${item.id}`}
              className="hover:bg-muted/50 flex border-b"
              style={{ height: ROW_PX }}
            >
              <div
                className="flex shrink-0 items-center border-r px-3 text-sm"
                style={{ width: LABEL_COL_PX }}
              >
                <span className="truncate">{item.title}</span>
                {item.isMust && <span className="ml-1 text-xs text-red-500">MUST</span>}
              </div>
              <div style={{ width: timelineWidth, position: 'relative', height: ROW_PX }}>
                <div
                  data-testid={`gantt-bar-${item.id}`}
                  data-critical={criticalSet.has(item.id) ? 'true' : 'false'}
                  className="absolute top-1 rounded text-xs leading-6"
                  style={{
                    left: barLeft,
                    width: barWidth,
                    height: ROW_PX - 8,
                    background: item.isMust ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.8)',
                    color: 'white',
                    paddingLeft: 6,
                    // critical path 強調: 赤い太枠 (TeamGantt / GanttPRO 風)
                    boxShadow: criticalSet.has(item.id) ? '0 0 0 2px rgb(220, 38, 38)' : undefined,
                  }}
                  title={`${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')}${criticalSet.has(item.id) ? ' (critical path)' : ''}`}
                >
                  {spanDays}d
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
