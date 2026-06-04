'use client'

import { useMemo } from 'react'
import {
  Calendar,
  type CalendarProps,
  dateFnsLocalizer,
  type EventProps,
  Views,
} from 'react-big-calendar'
import withDragAndDrop, {
  type EventInteractionArgs,
  type withDragAndDropProps,
} from 'react-big-calendar/lib/addons/dragAndDrop'

import { format, getDay, parse, startOfWeek } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'

import type { Schedule, ScheduleKind } from '@/features/schedule/schema'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// withDragAndDrop の HOC 型は Calendar の generic を維持しないので、
// 一旦 unknown 経由で ScheduleEvent 用 ComponentType に narrow して合成する。
// 内部は CalendarProps + DnD props を merge した型になる。
const TypedCalendar = Calendar as unknown as React.ComponentType<
  CalendarProps<ScheduleEvent> & withDragAndDropProps<ScheduleEvent>
>
const DnDCalendar = withDragAndDrop<ScheduleEvent>(TypedCalendar)

export interface ScheduleEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Schedule
}

interface Props {
  kind: ScheduleKind
  date: Date
  schedules: Schedule[]
  itemTitleById: Map<string, string>
  onMoveOrResize: (s: Schedule, startAt: Date, endAt: Date) => void
  onSelectSlot: (start: Date, end: Date) => void
  onSelectEvent: (s: Schedule) => void
  /** 表示中の lane が走行中タイマーを持っているとき、live event を末尾に挿入 */
  liveEvent?: ScheduleEvent | null
}

const KIND_PALETTE: Record<ScheduleKind, { bg: string; border: string; text: string }> = {
  planned: {
    bg: 'rgba(99, 102, 241, 0.18)',
    border: 'rgba(79, 70, 229, 0.7)',
    text: 'rgb(55, 48, 163)',
  },
  actual: {
    bg: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(5, 150, 105, 0.7)',
    text: 'rgb(6, 95, 70)',
  },
}

function EventBlock({ event }: EventProps<ScheduleEvent>) {
  // iter1773: title 行は truncate で長 event.title 切れ、react-big-calendar wrapper の
  // accessible name 経路 (tab/select) のみで sighted は hover で全 title 見れず。
  // 親 div の title 属性で sighted hover で event.title + 時刻 disclose (iter1769
  // workflows-panel / iter1771 schedule-item-picker と同 truncate + title pattern を
  // calendar event block にも展開、line-clamp + title sweep の timeline 補完)。
  const fullLabel = `${event.title} — ${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`
  return (
    <div
      className="flex h-full flex-col overflow-hidden text-[11px] leading-tight"
      title={fullLabel}
    >
      <div className="truncate font-medium">{event.title}</div>
      <div className="truncate opacity-70">
        {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
      </div>
    </div>
  )
}

export function TimelineLane({
  kind,
  date,
  schedules,
  itemTitleById,
  onMoveOrResize,
  onSelectSlot,
  onSelectEvent,
  liveEvent,
}: Props) {
  const events = useMemo<ScheduleEvent[]>(() => {
    const list: ScheduleEvent[] = schedules.map((s) => ({
      id: s.id,
      title: s.itemId ? (itemTitleById.get(s.itemId) ?? '(該当 task 不明)') : (s.note ?? '割込み'),
      start: s.startAt,
      end: s.endAt,
      resource: s,
    }))
    if (liveEvent) list.push(liveEvent)
    return list
  }, [schedules, itemTitleById, liveEvent])

  const palette = KIND_PALETTE[kind]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DnDCalendar
        localizer={localizer}
        date={date}
        view={Views.DAY}
        onView={() => {}}
        onNavigate={() => {}}
        toolbar={false}
        events={events}
        defaultView={Views.DAY}
        step={30}
        timeslots={2}
        min={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0)}
        max={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)}
        selectable
        resizable
        onSelectSlot={({ start, end }) => onSelectSlot(start as Date, end as Date)}
        onSelectEvent={(e) => onSelectEvent((e as ScheduleEvent).resource)}
        onEventDrop={(args: EventInteractionArgs<ScheduleEvent>) => {
          const start = args.start instanceof Date ? args.start : new Date(args.start)
          const end = args.end instanceof Date ? args.end : new Date(args.end)
          onMoveOrResize(args.event.resource, start, end)
        }}
        onEventResize={(args: EventInteractionArgs<ScheduleEvent>) => {
          const start = args.start instanceof Date ? args.start : new Date(args.start)
          const end = args.end instanceof Date ? args.end : new Date(args.end)
          onMoveOrResize(args.event.resource, start, end)
        }}
        components={{
          event: EventBlock,
        }}
        eventPropGetter={() => ({
          style: {
            backgroundColor: palette.bg,
            borderLeft: `3px solid ${palette.border}`,
            color: palette.text,
            borderRadius: '4px',
            padding: '2px 6px',
          },
        })}
        style={{ height: '100%', minHeight: 600 }}
      />
    </div>
  )
}
