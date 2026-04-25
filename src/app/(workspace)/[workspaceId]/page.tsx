import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { AuthError, PermissionError } from '@/lib/errors'

import { notificationService } from '@/features/notification/service'
import { findMyWorkspaces } from '@/features/workspace/repository'

import { GlobalShortcuts } from '@/components/shared/global-shortcuts'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { HeartbeatButton } from '@/components/workspace/heartbeat-button'
import { ItemsBoard } from '@/components/workspace/items-board'
import { NotificationBell } from '@/components/workspace/notification-bell'
import { StandupButton } from '@/components/workspace/standup-button'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'

interface PageProps {
  params: Promise<{ workspaceId: string }>
}

async function loadAccess(workspaceId: string) {
  try {
    return await requireWorkspaceMember(workspaceId)
  } catch (e) {
    if (e instanceof AuthError) redirect('/login')
    if (e instanceof PermissionError) redirect('/')
    throw e
  }
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)

  const workspaces = await withUserDb(user.id, (tx) => findMyWorkspaces(tx, user.id))
  const workspace = workspaces.find((w) => w.id === workspaceId)
  const displayName = workspace?.name ?? 'Workspace'

  // Bell の初期未読件数を SSR 時に取得 (client polling を避けて Realtime のみで更新)
  const unreadResult = await notificationService.unreadCount(workspaceId)
  const initialUnreadCount = unreadResult.ok ? unreadResult.value : 0

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <WorkspaceHeader
        title={displayName}
        role={role}
        subtitle={user.email ?? ''}
        pageActions={
          <>
            <HeartbeatButton workspaceId={workspaceId} />
            <StandupButton workspaceId={workspaceId} />
            <Button variant="outline" asChild size="sm">
              <Link href={`/${workspaceId}/goals`}>Goals</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/${workspaceId}/sprints`}>Sprints</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/${workspaceId}/pdca`}>PDCA</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href={`/${workspaceId}/templates`}>Templates</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/">← 一覧</Link>
            </Button>
          </>
        }
        utility={
          <>
            <NotificationBell
              workspaceId={workspaceId}
              currentUserId={user.id}
              initialUnreadCount={initialUnreadCount}
            />
            <ThemeToggle />
          </>
        }
      />

      <GlobalShortcuts workspaceId={workspaceId} />
      <ItemsBoard workspaceId={workspaceId} currentUserId={user.id} />
    </main>
  )
}
