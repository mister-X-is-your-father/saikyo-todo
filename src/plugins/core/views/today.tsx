import { TodayView } from '@/components/workspace/today-view'

import type { ViewPlugin } from '../../types'

export const todayViewPlugin: ViewPlugin = {
  id: 'core.view.today',
  label: 'Today',
  render: ({ workspaceId, items }) => <TodayView workspaceId={workspaceId} items={items} />,
}
