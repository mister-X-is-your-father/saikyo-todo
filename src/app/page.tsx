import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthError } from '@/lib/errors'

import { workspaceService } from '@/features/workspace/service'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateWorkspaceForm } from '@/components/workspace/create-workspace-form'

async function loadWorkspaces() {
  try {
    return await workspaceService.listForCurrentUser()
  } catch (e) {
    if (e instanceof AuthError) redirect('/login')
    throw e
  }
}

export default async function HomePage() {
  const workspaces = await loadWorkspaces()

  return (
    <main className="container mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">最強TODO</h1>
        <form
          action={async () => {
            'use server'
            const { logoutAction } = await import('@/features/auth/actions')
            await logoutAction()
            redirect('/login')
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            ログアウト
          </Button>
        </form>
      </header>

      {workspaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>最初の Workspace を作成</CardTitle>
            <CardDescription>
              チームで共有する最初の Workspace を作りましょう。後から追加 / 切替できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm />
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Workspace</h2>
          </div>
          <ul className="space-y-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/${ws.id}`}
                  className="hover:bg-muted block rounded-lg border p-4 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{ws.name}</h3>
                      <p className="text-muted-foreground text-xs">
                        /{ws.slug} · あなたの role: {ws.role}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Card id="new">
            <CardHeader>
              <CardTitle className="text-base">別の Workspace を作成</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateWorkspaceForm />
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  )
}
