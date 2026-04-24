import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { AuthError, PermissionError } from '@/lib/errors'

import { findMyWorkspaces } from '@/features/workspace/repository'

import { GlobalShortcuts } from '@/components/shared/global-shortcuts'
import { Badge } from '@/components/ui/badge'
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

  const workspaces = await withUserDb(user.id, (tx) => findMyWorkspaces(tx, user.id))
  const workspace = workspaces.find((w) => w.id === workspaceId)
  const displayName = workspace?.name ?? 'Workspace'

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{displayName}</h1>
            <Badge variant="secondary" className="shrink-0">
              {role}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 truncate text-xs">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeartbeatButton workspaceId={workspaceId} />
          <StandupButton workspaceId={workspaceId} />
          <Button variant="outline" asChild size="sm">
            <Link href={`/${workspaceId}/templates`}>Templates</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/">← 一覧</Link>
          </Button>
        </div>
      </header>

      <GlobalShortcuts workspaceId={workspaceId} />
      <ItemsBoard workspaceId={workspaceId} />
    </main>
  )
}
