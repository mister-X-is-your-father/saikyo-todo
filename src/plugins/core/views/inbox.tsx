import { InboxView } from '@/components/workspace/inbox-view'

import type { ViewPlugin } from '../../types'

export const inboxViewPlugin: ViewPlugin = {
  id: 'core.view.inbox',
  label: 'Inbox',
  render: ({ workspaceId, items }) => <InboxView workspaceId={workspaceId} items={items} />,
}
