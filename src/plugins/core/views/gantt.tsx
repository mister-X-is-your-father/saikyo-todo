import { GanttViewWithDeps } from '@/components/workspace/gantt-view-with-deps'

import type { ViewPlugin } from '../../types'

export const ganttViewPlugin: ViewPlugin = {
  id: 'core.view.gantt',
  label: 'Gantt',
  // Phase 6.15 iter 8: workspace 横断 blocks edges + critical path を計算して渡す
  render: ({ workspaceId, items }) => <GanttViewWithDeps workspaceId={workspaceId} items={items} />,
}
