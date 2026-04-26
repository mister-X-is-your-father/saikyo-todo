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
import { useEffect, useMemo, useRef } from 'react'

import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'

import type { Item } from '@/features/item/schema'

import { type GanttBar, type GanttDepEdge, GanttDependencyArrows } from './gantt-dependency-arrows'

interface Props {
  workspaceId: string
  items: Item[]
  /** Phase 6.10 item_dependencies の type='blocks' edges (workspace 横断) */
  edges?: GanttDepEdge[]
  /** Phase 6.15 iter 1 computeCriticalPath の criticalPathIds */
  criticalIds?: string[]
  /** Phase 6.15 iter 46 — CPM 出力 projectDurationDays (summary banner 用) */
  projectDurationDays?: number
}

const ROW_PX = 32
const HEADER_PX = 32
const LABEL_COL_PX = 240
/** Phase 6.15 iter 73: TeamGantt 風 zoom (1 day = N px)。default は 1x = 40px。 */
const ZOOM_PX: Record<'compact' | 'normal' | 'wide', number> = {
  compact: 24,
  normal: 40,
  wide: 64,
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = typeof v === 'string' ? parseISO(v) : v
  return isValid(d) ? d : null
}

export function GanttView({
  items,
  edges = [],
  criticalIds = [],
  projectDurationDays,
}: Omit<Props, 'workspaceId'> & { workspaceId?: string }) {
  const active = useMemo(() => items.filter((i) => !i.deletedAt), [items])
  const criticalSet = useMemo(() => new Set(criticalIds), [criticalIds])
  // Phase 6.15 iter 31: bar click で ItemEditDialog (deep link 経由) を開く
  const [, setOpenItemId] = useQueryState('item', parseAsString)
  // Phase 6.15 iter 60: "今日にジャンプ" — outer scroll container を ref で持つ
  const scrollRef = useRef<HTMLDivElement | null>(null)
  // Phase 6.15 iter 62/75: 完了済 (doneAt あり) を行から隠す toggle (TeamGantt 風 filter)。
  // iter 75 で nuqs URL state 化 (?hideDone=true が refresh 後も保持される)
  const [hideDone, setHideDone] = useQueryState('hideDone', parseAsBoolean.withDefault(false))
  // Phase 6.15 iter 73-74: zoom (compact/normal/wide) — TeamGantt の day/week/month zoom 相当。
  // iter 74 で nuqs URL state 化 (?zoom=wide が refresh 後も保持される)
  const [zoom, setZoom] = useQueryState(
    'zoom',
    parseAsStringLiteral(['compact', 'normal', 'wide'] as const).withDefault('normal'),
  )
  const dayPx = ZOOM_PX[zoom]

  const withDates = useMemo(
    () =>
      active
        .filter((i) => (hideDone ? !i.doneAt : true))
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
    [active, hideDone],
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

  // 共通計算。range が null (= withDates 空) のときは安全に飛ばす。
  const totalDays = range ? differenceInCalendarDays(range.end, range.start) + 1 : 0
  const timelineWidth = totalDays * dayPx
  const days: Date[] = []
  if (range) {
    for (let i = 0; i < totalDays; i++) days.push(addDays(range.start, i))
  }

  // Today 縦線 (TeamGantt/GanttPRO の典型機能)。range 範囲外なら null
  const today = new Date()
  const todayDayOffset = range ? differenceInCalendarDays(today, range.start) : -1
  const todayInRange = todayDayOffset >= 0 && todayDayOffset < totalDays
  // bar の day cell は左端に位置するので、現在時刻分だけ dayPx 内をシフト
  const todayHourFraction = (today.getHours() * 60 + today.getMinutes()) / (24 * 60)
  const todayX = todayInRange ? (todayDayOffset + todayHourFraction) * dayPx : null

  // Phase 6.15 iter 61: 初回 mount で today に自動スクロール (TeamGantt default)。
  // 早期 return より先に Hook を呼ぶ必要があるためここに置く (rules-of-hooks)。
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    if (didInitialScrollRef.current) return
    if (todayX === null) return
    const el = scrollRef.current
    if (!el) return
    didInitialScrollRef.current = true
    const target = LABEL_COL_PX + todayX - el.clientWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'instant' as ScrollBehavior })
  }, [todayX])

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

  // 行の Y 位置 = HEADER_PX + index * ROW_PX、bar は top:1 + (ROW_PX - 8)/2 が中央
  const ganttBars: GanttBar[] = withDates.map((x, idx) => {
    const leftDays = differenceInCalendarDays(x.start, range!.start)
    const spanDays = differenceInCalendarDays(x.due, x.start) + 1
    const barLeft = leftDays * dayPx
    const barWidth = spanDays * dayPx
    return {
      id: x.item.id,
      leftPx: barLeft,
      rightPx: barLeft + barWidth,
      centerYPx: HEADER_PX + idx * ROW_PX + ROW_PX / 2,
      isCritical: criticalSet.has(x.item.id),
    }
  })

  const totalHeight = HEADER_PX + withDates.length * ROW_PX

  // 月境界線 (TeamGantt 風)。日 i の day が前日と異なる月に変わるとき縦線
  const monthBoundaryDays: number[] = []
  for (let i = 1; i < days.length; i++) {
    if (days[i]!.getMonth() !== days[i - 1]!.getMonth()) {
      monthBoundaryDays.push(i)
    }
  }

  const criticalCount = criticalSet.size
  const totalSpanDays = differenceInCalendarDays(range!.end, range!.start) + 1

  // Phase 6.15 iter 51: baseline 比較 — slip (現在の dueDate が当初計画 baselineEndDate を
  // 何日超過したか) を集計。slipDays > 0 = 遅延、< 0 = 前倒し。
  let baselineCount = 0
  let slipItemCount = 0
  let totalSlipDays = 0
  for (const x of withDates) {
    const blEnd = toDate(x.item.baselineEndDate)
    if (!blEnd) continue
    baselineCount += 1
    const slip = differenceInCalendarDays(x.due, blEnd)
    if (slip > 0) {
      slipItemCount += 1
      totalSlipDays += slip
    }
  }

  function scrollToToday(behavior: ScrollBehavior = 'smooth') {
    const el = scrollRef.current
    if (!el || todayX === null) return
    const target = LABEL_COL_PX + todayX - el.clientWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior })
  }

  return (
    <div ref={scrollRef} data-testid="gantt-view" className="overflow-auto rounded-lg border">
      {/* Project summary banner (Phase 6.15 iter 46 — TeamGantt/GanttPRO 風) */}
      <div
        data-testid="gantt-summary"
        className="bg-muted/40 text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1.5 text-xs"
      >
        <span>
          表示範囲 <span className="text-foreground font-mono">{totalSpanDays}</span> 日
        </span>
        <span>
          表示中 Item <span className="text-foreground font-mono">{withDates.length}</span> 件
        </span>
        {projectDurationDays !== undefined && projectDurationDays > 0 && (
          <span>
            CPM 期間 <span className="text-foreground font-mono">{projectDurationDays}</span> 日
          </span>
        )}
        {criticalCount > 0 && (
          <span className="text-red-600 dark:text-red-400">
            critical path <span className="font-mono">{criticalCount}</span> 件
          </span>
        )}
        {baselineCount > 0 && (
          <span data-testid="gantt-summary-baseline">
            baseline <span className="text-foreground font-mono">{baselineCount}</span> 件
          </span>
        )}
        {slipItemCount > 0 && (
          <span
            data-testid="gantt-summary-slip"
            className="text-amber-600 dark:text-amber-400"
            title={`baseline より遅れている item の合計遅延日数`}
          >
            遅延 <span className="font-mono">{slipItemCount}</span> 件 / 計
            <span className="font-mono"> {totalSlipDays}</span> 日
          </span>
        )}
        <label className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">zoom</span>
          <select
            value={zoom}
            onChange={(e) => setZoom(e.target.value as typeof zoom)}
            className="rounded border bg-transparent px-1 py-0.5 text-xs"
            data-testid="gantt-zoom-select"
            aria-label="Gantt の 1 日あたりの幅"
          >
            <option value="compact">狭 (24px/day)</option>
            <option value="normal">標準 (40px/day)</option>
            <option value="wide">広 (64px/day)</option>
          </select>
        </label>
        <label data-testid="gantt-hide-done-toggle" className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="size-3.5 cursor-pointer accent-current"
          />
          完了済を隠す
        </label>
        {todayX !== null && (
          <button
            type="button"
            data-testid="gantt-jump-today"
            onClick={() => scrollToToday('smooth')}
            className="text-foreground hover:bg-muted rounded border px-2 py-0.5 text-xs"
            title="今日の縦線まで横スクロール"
          >
            今日へジャンプ
          </button>
        )}
      </div>
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
        {/* Today 縦線 (Phase 6.15 iter 10 — TeamGantt/GanttPRO の典型機能) */}
        {todayX !== null && (
          <div
            data-testid="gantt-today-line"
            aria-label="今日"
            className="pointer-events-none absolute z-20"
            style={{
              left: LABEL_COL_PX + todayX,
              top: 0,
              width: 1.5,
              height: totalHeight,
              background: 'rgba(220, 38, 38, 0.7)', // red-600 半透明
            }}
          >
            <span
              className="absolute -top-0.5 left-1 rounded bg-red-600 px-1 py-0.5 text-[10px] leading-none text-white"
              style={{ whiteSpace: 'nowrap' }}
            >
              今日
            </span>
          </div>
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
            {days.map((d, i) => {
              const dow = d.getDay() // 0=Sun / 6=Sat
              const isWeekend = dow === 0 || dow === 6
              return (
                <div
                  key={i}
                  style={{ width: dayPx }}
                  data-weekend={isWeekend ? 'true' : 'false'}
                  className={
                    'shrink-0 border-r px-1 text-center text-xs ' +
                    (isWeekend ? 'text-muted-foreground bg-muted/40' : 'text-muted-foreground')
                  }
                >
                  {format(d, 'M/d')}
                </div>
              )
            })}
          </div>
        </div>
        {/* 月境界線 (Phase 6.15 iter 16 — TeamGantt 風) */}
        {monthBoundaryDays.length > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10"
            style={{
              left: LABEL_COL_PX,
              top: 0,
              width: timelineWidth,
              height: totalHeight,
            }}
          >
            {monthBoundaryDays.map((dayIdx) => (
              <div
                key={`month-${dayIdx}`}
                data-testid={`gantt-month-boundary-${dayIdx}`}
                className="absolute"
                style={{
                  left: dayIdx * dayPx - 0.5,
                  top: 0,
                  width: 1,
                  height: '100%',
                  background: 'rgba(100, 116, 139, 0.4)', // slate-500 半透明
                }}
              >
                <span
                  className="bg-background absolute -top-1 left-0.5 rounded px-1 text-[10px] leading-none font-medium text-slate-700 dark:text-slate-300"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {format(days[dayIdx]!, 'M月')}
                </span>
              </div>
            ))}
          </div>
        )}
        {/* 週末縦帯 (Phase 6.15 iter 11 — TeamGantt の典型表現)。bar の下に薄い背景 */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: LABEL_COL_PX,
            top: HEADER_PX,
            width: timelineWidth,
            height: totalHeight - HEADER_PX,
          }}
        >
          {days.map((d, i) => {
            const dow = d.getDay()
            if (dow !== 0 && dow !== 6) return null
            return (
              <div
                key={`weekend-${i}`}
                data-testid={`gantt-weekend-${i}`}
                className="absolute"
                style={{
                  left: i * dayPx,
                  top: 0,
                  width: dayPx,
                  height: '100%',
                  background: 'rgba(148, 163, 184, 0.10)', // slate-400 薄め
                }}
              />
            )
          })}
        </div>

        {/* Rows */}
        {withDates.map(({ item, start, due }, idx) => {
          const leftDays = differenceInCalendarDays(start, range!.start)
          const spanDays = differenceInCalendarDays(due, start) + 1
          const barLeft = leftDays * dayPx
          const barWidth = spanDays * dayPx
          // 完了済 (doneAt あり) は TeamGantt 風 opacity を下げ + bar に取り消し線
          const isDone = Boolean(item.doneAt)
          const baseAlpha = isDone ? 0.4 : item.isMust ? 0.9 : 0.8
          const barBg = item.isMust
            ? `rgba(239,68,68,${baseAlpha})`
            : `rgba(59,130,246,${baseAlpha})`
          // Phase 6.15 iter 49: baseline (TeamGantt 風 — 当初計画 vs 現在の差分)
          const blStart = toDate(item.baselineStartDate)
          const blEnd = toDate(item.baselineEndDate)
          const hasBaseline = Boolean(blStart && blEnd)
          const baselineLeft = blStart ? differenceInCalendarDays(blStart, range!.start) * dayPx : 0
          const baselineWidth =
            blStart && blEnd ? (differenceInCalendarDays(blEnd, blStart) + 1) * dayPx : 0
          // Phase 6.15 iter 51: slip 日数 (現 due - baselineEnd)。tooltip / title に追記
          const slipDays = blEnd ? differenceInCalendarDays(due, blEnd) : 0
          const slipText = !blEnd
            ? ''
            : slipDays > 0
              ? ` [遅延 +${slipDays}日]`
              : slipDays < 0
                ? ` [前倒し ${slipDays}日]`
                : ' [計画通り]'
          // Phase 6.15 iter 79: bar 内部に進捗 fill (TeamGantt 風)。status 文字列ベース。
          //   todo: 0% / in_progress: 50% / done: 100% (それ以外は 0%)
          //   done は既に opacity 落としていて見にくいので fill は省略
          const progressPct = isDone
            ? 0
            : item.status === 'in_progress'
              ? 50
              : item.status === 'done'
                ? 100
                : 0
          return (
            <div
              key={item.id}
              data-testid={`gantt-row-${item.id}`}
              className="hover:bg-muted/50 flex border-b"
              style={{ height: ROW_PX }}
            >
              <div
                className="flex shrink-0 items-center gap-2 border-r px-3 text-sm"
                style={{ width: LABEL_COL_PX }}
              >
                {/* 行番号 (TeamGantt 風 — 全体把握しやすく) */}
                <span
                  className="text-muted-foreground inline-block w-5 shrink-0 text-right text-xs tabular-nums"
                  data-testid={`gantt-row-num-${idx + 1}`}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{item.title}</span>
                {item.isMust && <span className="ml-1 shrink-0 text-xs text-red-500">MUST</span>}
              </div>
              <div style={{ width: timelineWidth, position: 'relative', height: ROW_PX }}>
                {hasBaseline && (
                  <div
                    data-testid={`gantt-baseline-${item.id}`}
                    aria-label={`baseline ${item.baselineStartDate} → ${item.baselineEndDate}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: baselineLeft,
                      width: baselineWidth,
                      bottom: 2,
                      height: 5,
                      background: 'rgba(100, 116, 139, 0.45)', // slate-500 半透明
                      borderRadius: 2,
                    }}
                    title={`baseline: ${item.baselineStartDate} → ${item.baselineEndDate}`}
                  />
                )}
                {spanDays === 1 ? (
                  // milestone (1 日完結) — TeamGantt 風 ◇ 菱形 (rotate 45)
                  <div
                    data-testid={`gantt-bar-${item.id}`}
                    data-milestone="true"
                    data-done={isDone ? 'true' : 'false'}
                    data-critical={criticalSet.has(item.id) ? 'true' : 'false'}
                    className="absolute"
                    style={{
                      left: barLeft + (dayPx - 18) / 2,
                      top: (ROW_PX - 18) / 2,
                      width: 18,
                      height: 18,
                      background: barBg,
                      transform: 'rotate(45deg)',
                      // Subtle drop shadow + critical 強調の 2 段重ね (TeamGantt 風)
                      boxShadow: criticalSet.has(item.id)
                        ? '0 0 0 2px rgb(220, 38, 38), 0 1px 2px rgba(0,0,0,0.18)'
                        : '0 1px 2px rgba(0,0,0,0.18)',
                      cursor: 'pointer',
                    }}
                    title={`${item.title} — ${format(start, 'yyyy-MM-dd')} (milestone)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}`}
                    onClick={() => void setOpenItemId(item.id)}
                  />
                ) : (
                  <div
                    data-testid={`gantt-bar-${item.id}`}
                    data-milestone="false"
                    data-done={isDone ? 'true' : 'false'}
                    data-critical={criticalSet.has(item.id) ? 'true' : 'false'}
                    className="absolute top-1 flex items-center gap-1 overflow-hidden rounded text-xs leading-6"
                    style={{
                      left: barLeft,
                      width: barWidth,
                      height: ROW_PX - 8,
                      background: barBg,
                      color: 'white',
                      paddingLeft: 6,
                      paddingRight: 6,
                      // Subtle drop shadow + critical 強調の 2 段重ね (TeamGantt 風)
                      boxShadow: criticalSet.has(item.id)
                        ? '0 0 0 2px rgb(220, 38, 38), 0 1px 2px rgba(0,0,0,0.18)'
                        : '0 1px 2px rgba(0,0,0,0.18)',
                      cursor: 'pointer',
                      textDecoration: isDone ? 'line-through' : undefined,
                    }}
                    title={`${item.title} — ${format(start, 'yyyy-MM-dd')} → ${format(due, 'yyyy-MM-dd')} (${spanDays}日)${isDone ? ' [完了]' : ''}${criticalSet.has(item.id) ? ' [critical path]' : ''}${slipText}${progressPct > 0 ? ` [進捗 ${progressPct}%]` : ''}`}
                    onClick={() => void setOpenItemId(item.id)}
                  >
                    {progressPct > 0 && (
                      <div
                        data-testid={`gantt-progress-${item.id}`}
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 rounded-l"
                        style={{
                          width: `${progressPct}%`,
                          background: 'rgba(0, 0, 0, 0.2)',
                        }}
                      />
                    )}
                    {/* 短い bar (< 60px) では title 省略して d だけにする */}
                    {barWidth >= 60 && (
                      <span className="truncate font-medium" style={{ maxWidth: barWidth - 32 }}>
                        {item.title}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 opacity-75">{spanDays}d</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
