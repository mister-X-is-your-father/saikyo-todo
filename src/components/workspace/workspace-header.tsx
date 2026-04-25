import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'

interface Props {
  title: string
  role: string
  subtitle: string
  /** ページ固有のアクション (ボタン群)。右側に並ぶ。 */
  pageActions?: ReactNode
  /**
   * 全 workspace ページ共通の右端 utility (ThemeToggle / NotificationBell 等)。
   * Phase 4 でこの slot に theme-toggle + notification-bell を入れる。
   */
  utility?: ReactNode
}

export function WorkspaceHeader({ title, role, subtitle, pageActions, utility }: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          <Badge variant="secondary" className="shrink-0">
            {role}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 truncate text-xs">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pageActions}
        {utility}
      </div>
    </header>
  )
}
