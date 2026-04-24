import { KanbanView } from '@/components/workspace/kanban-view'

import type { ViewPlugin } from '../../types'

export const kanbanViewPlugin: ViewPlugin = {
  id: 'core.view.kanban',
  label: 'Kanban',
  render: ({ workspaceId, items }) => <KanbanView workspaceId={workspaceId} items={items} />,
}
