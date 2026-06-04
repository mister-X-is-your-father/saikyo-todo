'use client'

/**
 * 二車線 Calendar view: 左=想定 (planned) / 右=実測 (actual)。
 * - 左 lane で空 drag → planned slot 作成 (item picker)
 * - 右 lane で空 drag → actual block 作成 (item / 割込み 選択)
 * - drag/resize で move (`useMoveSchedule`)
 * - クリックで delete confirm
 * - 上部 chip: 想定 vs 実測 diff サマリ
 */
import { useMemo, useState } from 'react'

import { addDays, format, startOfDay, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { isAppError } from '@/lib/errors'
import { useActiveTimerStore } from '@/lib/stores/active-timer'

import { useItems } from '@/features/item/hooks'
import {
  useCreateSchedule,
  useMoveSchedule,
  useSchedulesByDate,
  useSchedulesRealtime,
  useSoftDeleteSchedule,
} from '@/features/schedule/hooks'
import type { Schedule } from '@/features/schedule/schema'

import { Button } from '@/components/ui/button'

import { DiffSummaryBar } from './diff-summary-bar'
import { ScheduleItemPicker } from './schedule-item-picker'
import { type ScheduleEvent, TimelineLane } from './timeline-lane'

interface Props {
  workspaceId: string
}

interface PendingSlot {
  start: Date
  end: Date
  kind: 'planned' | 'actual'
}

function dateISO(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function CalendarView({ workspaceId }: Props) {
  const [date, setDate] = useState(() => startOfDay(new Date()))
  const dateStr = dateISO(date)

  useSchedulesRealtime(workspaceId, dateStr)
  const { data: schedules = [], isLoading } = useSchedulesByDate(workspaceId, dateStr)
  const { data: items = [] } = useItems(workspaceId)
  const create = useCreateSchedule(workspaceId, dateStr)
  const move = useMoveSchedule(workspaceId, dateStr)
  const softDelete = useSoftDeleteSchedule(workspaceId, dateStr)

  const itemTitleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) m.set(it.id, it.title)
    return m
  }, [items])

  const planned = useMemo(() => schedules.filter((s) => s.kind === 'planned'), [schedules])
  const actual = useMemo(() => schedules.filter((s) => s.kind === 'actual'), [schedules])

  const [pending, setPending] = useState<PendingSlot | null>(null)

  // Active timer (Zustand) → live event を右 lane に注入
  const timerItemId = useActiveTimerStore((s) => s.itemId)
  const timerItemTitle = useActiveTimerStore((s) => s.itemTitle)
  const timerStartedAt = useActiveTimerStore((s) => s.startedAt)
  const timerRunning = useActiveTimerStore((s) => s.running)
  const liveEvent: ScheduleEvent | null = useMemo(() => {
    if (!timerItemId || !timerStartedAt || !timerRunning) return null
    const start = new Date(timerStartedAt)
    if (dateISO(start) !== dateStr) return null
    return {
      id: '__live__',
      title: `▶ ${timerItemTitle ?? '(計測中)'}`,
      start,
      end: new Date(),
      resource: {
        id: '__live__',
        workspaceId,
        itemId: timerItemId,
        kind: 'actual',
        startAt: start,
        endAt: new Date(),
        note: null,
        createdBy: '',
        deletedAt: null,
        version: 0,
        createdAt: start,
        updatedAt: start,
      } as Schedule,
    }
  }, [timerItemId, timerItemTitle, timerStartedAt, timerRunning, dateStr, workspaceId])

  function handleSelectSlot(kind: 'planned' | 'actual', start: Date, end: Date) {
    setPending({ start, end, kind })
  }

  function commitPending(input: { itemId: string | null; note?: string | null }) {
    if (!pending) return
    create.mutate(
      {
        workspaceId,
        itemId: input.itemId,
        kind: pending.kind,
        startAt: pending.start.toISOString(),
        endAt: pending.end.toISOString(),
        note: input.note ?? null,
      },
      {
        onError: (e) => toast.error(isAppError(e) ? e.message : '作成に失敗しました'),
        onSettled: () => setPending(null),
      },
    )
  }

  function handleMove(s: Schedule, startAt: Date, endAt: Date) {
    if (s.id === '__live__') return // live event は drag 不可
    move.mutate(
      {
        id: s.id,
        expectedVersion: s.version,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      {
        onError: (e) => toast.error(isAppError(e) ? e.message : '移動に失敗しました'),
      },
    )
  }

  function handleSelectEvent(s: Schedule) {
    if (s.id === '__live__') return
    if (typeof window === 'undefined') return
    if (!window.confirm('このスロットを削除しますか?')) return
    softDelete.mutate(
      { id: s.id, expectedVersion: s.version },
      {
        onError: (e) => toast.error(isAppError(e) ? e.message : '削除に失敗しました'),
        onSuccess: () => toast.success('スロットを削除しました'),
      },
    )
  }

  function handleDiffSelect(itemId: string | null) {
    if (!itemId) return
    const target = schedules.find((s) => s.itemId === itemId)
    if (!target) return
    setDate(startOfDay(target.startAt))
  }

  return (
    <div className="flex h-full min-h-[700px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2"
          role="group"
          /* iter1588: 旧 aria-label paren convention `"カレンダー日付ナビゲーション (現在: X、前日 / 翌日 / 今日)"` は
             iter1093-1587 sweep の em-dash 区切と divergent。区切のみ '(現在:' → ' — 現在' に統一、closing ')' は削除。 */
          aria-label={`カレンダー日付ナビゲーション — 現在 ${format(date, 'yyyy年M月d日 (eee)')}、前日 / 翌日 / 今日`}
        >
          {/* iter1765: ChevronLeft icon-only button、aria-label は browser tooltip にならず
              sighted は hover で「前日」 と即把握できなかった。title 付与で同期 (iter1763
              theme-toggle / iter1764 notification と同 icon-only pattern)。 */}
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() => setDate((d) => subDays(d, 1))}
            aria-label={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}
            title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}
            data-testid="calendar-prev-btn"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2 aria-live="polite" aria-atomic="true" className="text-base font-semibold">
            {format(date, 'yyyy年 M月 d日 (eee)')}
          </h2>
          {/* iter1765: 翌日 navigation button も同 pattern。 */}
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() => setDate((d) => addDays(d, 1))}
            aria-label={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}
            title={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}
            data-testid="calendar-next-btn"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => setDate(startOfDay(new Date()))}
            // iter1146: 旧 aria-label `表示日を今日 (...) にリセット` は visible "今日" を
            // 中位置に持ち voice control prefix-matching「click 今日」 match 不可。
            // iter1093-1145 sweep convention に揃え visible 冒頭 + em-dash 区切で descriptive 残す。
            aria-label={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}
            data-testid="calendar-today-btn"
          >
            <span aria-hidden="true">今日</span>
          </Button>
        </div>
        <div className="text-muted-foreground text-xs">
          想定 {planned.length} 件 / 実測 {actual.length} 件
          {(create.isPending || move.isPending || softDelete.isPending) && (
            <Loader2
              className="ml-2 inline h-3 w-3 motion-safe:animate-spin"
              aria-label="保存中"
              role="status"
            />
          )}
        </div>
      </div>

      <div className="bg-muted/40 -mx-3 rounded px-3">
        <DiffSummaryBar
          schedules={schedules}
          itemTitleById={itemTitleById}
          onSelect={handleDiffSelect}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <section
          className="bg-background flex min-h-0 flex-col rounded-lg border"
          aria-labelledby="calendar-lane-planned-heading"
        >
          <h3
            id="calendar-lane-planned-heading"
            className="border-b px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 dark:text-indigo-400"
          >
            想定タイムライン
            <span className="text-muted-foreground ml-1 font-normal">
              (左 lane / {planned.length} 件)
            </span>
          </h3>
          <div className="min-h-0 flex-1">
            {isLoading ? (
              <div
                className="text-muted-foreground flex h-full items-center justify-center text-sm"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                {/* iter1318: ASCII "..." → Unicode "…" で codebase ellipsis convention 統一 */}
                読み込み中…
              </div>
            ) : (
              <TimelineLane
                kind="planned"
                date={date}
                schedules={planned}
                itemTitleById={itemTitleById}
                onMoveOrResize={handleMove}
                onSelectSlot={(s, e) => handleSelectSlot('planned', s, e)}
                onSelectEvent={handleSelectEvent}
              />
            )}
          </div>
        </section>

        <section
          className="bg-background flex min-h-0 flex-col rounded-lg border"
          aria-labelledby="calendar-lane-actual-heading"
        >
          <h3
            id="calendar-lane-actual-heading"
            className="border-b px-3 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400"
          >
            実測タイムライン
            <span className="text-muted-foreground ml-1 font-normal">
              (右 lane / {actual.length} 件)
            </span>
          </h3>
          <div className="min-h-0 flex-1">
            {isLoading ? (
              <div
                className="text-muted-foreground flex h-full items-center justify-center text-sm"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                {/* iter1318: ASCII "..." → Unicode "…" で codebase ellipsis convention 統一 */}
                読み込み中…
              </div>
            ) : (
              <TimelineLane
                kind="actual"
                date={date}
                schedules={actual}
                itemTitleById={itemTitleById}
                onMoveOrResize={handleMove}
                onSelectSlot={(s, e) => handleSelectSlot('actual', s, e)}
                onSelectEvent={handleSelectEvent}
                liveEvent={liveEvent}
              />
            )}
          </div>
        </section>
      </div>

      {pending ? (
        <ScheduleItemPicker
          items={items}
          allowInterrupt={pending.kind === 'actual'}
          onPick={commitPending}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  )
}
