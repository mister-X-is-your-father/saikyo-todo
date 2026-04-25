import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { ThemeToggle } from '@/components/shared/theme-toggle'
import { TemplatesPanel } from '@/components/template/templates-panel'
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

export default async function TemplatesPage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <WorkspaceHeader
        title="Templates"
        role={role}
        subtitle={`ワークパッケージ定義 · ${user.email ?? ''}`}
        pageActions={
          <Button variant="outline" asChild size="sm">
            <Link href={`/${workspaceId}`}>← Workspace</Link>
          </Button>
        }
        utility={
          <>
            <NotificationBell workspaceId={workspaceId} currentUserId={user.id} />
            <ThemeToggle />
          </>
        }
      />

      <TemplatesPanel workspaceId={workspaceId} />
    </main>
  )
}
