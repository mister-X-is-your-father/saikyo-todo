'use client'

/**
 * Gantt View (3rd ViewPlugin)。MVP は棒のみ、依存線は post-MVP。
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
 */
import { useMemo } from 'react'

import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'

import type { Item } from '@/features/item/schema'

interface Props {
  workspaceId: string
  items: Item[]
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

export function GanttView({ items }: Omit<Props, 'workspaceId'> & { workspaceId?: string }) {
  const active = useMemo(() => items.filter((i) => !i.deletedAt), [items])

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

  return (
    <div data-testid="gantt-view" className="overflow-auto rounded-lg border">
      <div style={{ width: LABEL_COL_PX + timelineWidth, position: 'relative' }}>
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
                  className="absolute top-1 rounded text-xs leading-6"
                  style={{
                    left: barLeft,
                    width: barWidth,
                    height: ROW_PX - 8,
                    background: item.isMust ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.8)',
                    color: 'white',
                    paddingLeft: 6,
                  }}
                  title={`${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')}`}
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
