import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { Button } from '@/components/ui/button'
import { HeartbeatButton } from '@/components/workspace/heartbeat-button'
import { ItemsBoard } from '@/components/workspace/items-board'
import { StandupButton } from '@/components/workspace/standup-button'

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

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspace</h1>
          <p className="text-muted-foreground text-sm">
            ID: {workspaceId} · あなた: {user.email} ({role})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HeartbeatButton workspaceId={workspaceId} />
          <StandupButton workspaceId={workspaceId} />
          <Button variant="outline" asChild size="sm">
            <Link href={`/${workspaceId}/templates`}>Templates</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/">← Workspace 一覧</Link>
          </Button>
        </div>
      </header>

      <ItemsBoard workspaceId={workspaceId} />
    </main>
  )
}
