import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { AuthError, PermissionError } from '@/lib/errors'

import { TemplatesPanel } from '@/components/template/templates-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">Templates</h1>
            <Badge variant="secondary" className="shrink-0">
              {role}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            ワークパッケージ定義 · {user.email}
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href={`/${workspaceId}`}>← Workspace</Link>
        </Button>
      </header>

      <TemplatesPanel workspaceId={workspaceId} />
    </main>
  )
}
