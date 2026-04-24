import { BacklogView } from '@/components/workspace/backlog-view'

import type { ViewPlugin } from '../../types'

export const backlogViewPlugin: ViewPlugin = {
  id: 'core.view.backlog',
  label: 'Backlog',
  render: ({ workspaceId, items }) => <BacklogView workspaceId={workspaceId} items={items} />,
}
