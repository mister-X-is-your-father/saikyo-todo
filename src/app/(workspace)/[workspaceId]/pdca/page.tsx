import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { notificationService } from '@/features/notification/service'

import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/workspace/notification-bell'
import { PdcaPanel } from '@/components/workspace/pdca-panel'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'

export const metadata: Metadata = { title: 'PDCA' }

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

export default async function PdcaPage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)
  const unreadResult = await notificationService.unreadCount(workspaceId)
  const initialUnreadCount = unreadResult.ok ? unreadResult.value : 0

  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="PDCA — Plan / Do / Check / Act + Lead time"
      className="container mx-auto max-w-5xl space-y-6 p-4 focus-visible:outline-none md:p-6"
      /* iter2075: 4 landmark family の 3 個目。 */
      title="PDCA — Plan / Do / Check / Act + Lead time"
    >
      <WorkspaceHeader
        title="PDCA"
        role={role}
        subtitle={`Plan / Do / Check / Act + Lead time · ${user.email ?? ''}`}
        pageActions={
          <Button variant="outline" asChild size="sm" className="min-h-11">
            <Link
              href={`/${workspaceId}`}
              aria-label="Workspace dashboard に戻る"
              title="Workspace dashboard に戻る"
            >
              <span aria-hidden="true">← Workspace</span>
            </Link>
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
      <PdcaPanel workspaceId={workspaceId} />
    </main>
  )
}
