import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { notificationService } from '@/features/notification/service'

import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { ArchivedItemsPanel } from '@/components/workspace/archived-items-panel'
import { NotificationBell } from '@/components/workspace/notification-bell'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'

export const metadata: Metadata = { title: 'Archive' }

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

export default async function ArchivePage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)
  const unreadResult = await notificationService.unreadCount(workspaceId)
  const initialUnreadCount = unreadResult.ok ? unreadResult.value : 0

  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="アーカイブ済 Item 一覧"
      className="container mx-auto max-w-5xl space-y-6 p-4 focus-visible:outline-none md:p-6"
      /* iter2077: 5 sub-page main landmark family の 5 個目 (archive)、8 main landmark
         family 全完備 (workspace + sprints + goals + pdca + workflows + time-entries +
         templates + integrations + archive)。 */
      title="アーカイブ済 Item 一覧"
    >
      <WorkspaceHeader
        title="アーカイブ"
        role={role}
        subtitle={`アーカイブ済 Item · ${user.email ?? ''}`}
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
            <ThemeToggle />
            <NotificationBell
              workspaceId={workspaceId}
              currentUserId={user.id}
              initialUnreadCount={initialUnreadCount}
            />
          </>
        }
      />
      {/* iter1406: archive page は h1 (WorkspaceHeader) の直下に panel の EmptyState h3 が
          来て heading-order skip (axe moderate / WCAG 1.3.1)。list region に sr-only h2 を
          挿し h1→h2→h3 の階層を整える (視覚は subtitle と重複するため非表示)。 */}
      <h2 className="sr-only">アーカイブ済 Item 一覧</h2>
      <ArchivedItemsPanel workspaceId={workspaceId} />
    </main>
  )
}
