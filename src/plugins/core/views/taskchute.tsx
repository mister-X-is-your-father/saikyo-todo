import { Sparkles } from 'lucide-react'

import { TaskChuteView } from '@/components/workspace/taskchute-view'

import type { ViewPlugin } from '../../types'

export const taskchuteViewPlugin: ViewPlugin = {
  id: 'core.view.taskchute',
  label: 'TaskChute',
  icon: <Sparkles className="h-4 w-4" />,
  render: ({ workspaceId, items }) => <TaskChuteView workspaceId={workspaceId} items={items} />,
}
