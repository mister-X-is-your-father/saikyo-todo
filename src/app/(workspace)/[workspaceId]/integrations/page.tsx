import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { notificationService } from '@/features/notification/service'

import { IntegrationsPanel } from '@/components/integrations/integrations-panel'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/workspace/notification-bell'
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

export default async function IntegrationsPage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)
  const unreadResult = await notificationService.unreadCount(workspaceId)
  const initialUnreadCount = unreadResult.ok ? unreadResult.value : 0

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <WorkspaceHeader
        title="API 連携"
        role={role}
        subtitle={`外部 API (Yamory / カスタム REST) → Item 取込 · ${user.email ?? ''}`}
        pageActions={
          <Button variant="outline" asChild size="sm">
            <Link href={`/${workspaceId}`}>← Workspace</Link>
          </Button>
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

      <IntegrationsPanel workspaceId={workspaceId} />
    </main>
  )
}
