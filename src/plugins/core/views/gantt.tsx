import { GanttView } from '@/components/workspace/gantt-view'

import type { ViewPlugin } from '../../types'

export const ganttViewPlugin: ViewPlugin = {
  id: 'core.view.gantt',
  label: 'Gantt',
  render: ({ workspaceId, items }) => <GanttView workspaceId={workspaceId} items={items} />,
}
