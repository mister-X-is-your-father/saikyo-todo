import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { TimeEntriesPanel } from '@/components/time-entry/time-entries-panel'
import { Button } from '@/components/ui/button'
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

export default async function TimeEntriesPage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <WorkspaceHeader
        title="稼働入力"
        role={role}
        subtitle={`やったこと + 時間を記録 · ${user.email ?? ''}`}
        pageActions={
          <Button variant="outline" asChild size="sm">
            <Link href={`/${workspaceId}`}>← Workspace</Link>
          </Button>
        }
      />

      <TimeEntriesPanel workspaceId={workspaceId} />
    </main>
  )
}
