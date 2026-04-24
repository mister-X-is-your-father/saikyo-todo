import { DashboardView } from '@/components/workspace/dashboard-view'

import type { ViewPlugin } from '../../types'

/**
 * MUST Dashboard。items プロップは使わず、自前の hooks で MUST summary + burndown を取得。
 * (board 全体の filter とは独立のダッシュボード文脈)
 */
export const dashboardViewPlugin: ViewPlugin = {
  id: 'core.view.dashboard',
  label: 'Dashboard',
  render: ({ workspaceId }) => <DashboardView workspaceId={workspaceId} />,
}
