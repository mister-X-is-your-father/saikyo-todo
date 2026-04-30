import { CalendarClock } from 'lucide-react'

import { CalendarView } from '@/components/schedule/calendar-view'

import type { ViewPlugin } from '../../types'

export const calendarViewPlugin: ViewPlugin = {
  id: 'core.view.calendar',
  label: 'Calendar',
  icon: <CalendarClock className="h-4 w-4" />,
  render: ({ workspaceId }) => <CalendarView workspaceId={workspaceId} />,
}
