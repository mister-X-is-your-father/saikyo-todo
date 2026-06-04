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
    <main
      id="main-content"
      tabIndex={-1}
      className="container mx-auto max-w-3xl space-y-8 p-6 focus-visible:outline-none"
    >
      <header className="flex items-center justify-between" aria-label="最強TODO ホーム">
        <h1 className="text-3xl font-bold">最強TODO</h1>
        <form
          aria-label="ログアウト"
          action={async () => {
            'use server'
            const { logoutAction } = await import('@/features/auth/actions')
            await logoutAction()
            redirect('/login')
          }}
        >
          {/* iter1724: 旧 aria-label "ログアウトしてログイン画面に戻る" は visible "ログアウト" を
              prefix として持つ (voice control prefix-matching OK) が、iter1093-1722 sweep の
              em-dash visible-prefix convention `<visible> — <descriptive>` と divergent
              (mock-top-nav 等は既に em-dash 形式)。区切のみ更新で codebase convention 統一、
              visible / 機能は不変、voice control prefix-match も維持。 */}
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="min-h-11"
            data-testid="logout-btn"
            aria-label="ログアウト — ログイン画面に戻る"
          >
            <span aria-hidden="true">ログアウト</span>
          </Button>
        </form>
      </header>

      {workspaces.length === 0 ? (
        <Card role="region" aria-labelledby="first-ws-heading">
          <CardHeader>
            <CardTitle id="first-ws-heading" role="heading" aria-level={2}>
              最初の Workspace を作成
            </CardTitle>
            <CardDescription>
              チームで共有する最初の Workspace を作りましょう。後から追加 / 切替できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceForm />
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4" aria-labelledby="workspaces-heading">
          <div className="flex items-center justify-between">
            <h2 id="workspaces-heading" className="text-xl font-semibold">
              Workspace
            </h2>
          </div>
          <ul className="space-y-2" aria-label="参加している Workspace 一覧">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                {/* iter1498: iter1093-1497 em-dash sweep に追従し () → em-dash 区切に
                    migration。visible-prefix ${ws.name} は無変更で voice control prefix-matching
                    維持、verb "を開く" を先頭側に置き iter1493 operation-board pattern と統一。
                    iter1629: 内部 colon `slug: ${X} / role: ${Y}` を iter1626-1628 sweep の
                    em-dash dynamic template convention に合わせ削除、`slug ${X} / role ${Y}` の
                    descriptor-value pair に natural-reading 統一。 */}
                <Link
                  href={`/${ws.id}`}
                  className="hover:bg-muted focus-visible:ring-ring block rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`}
                  data-testid={`workspace-link-${ws.id}`}
                >
                  <div className="flex items-center justify-between" aria-hidden="true">
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

          <Card id="new" role="region" aria-labelledby="another-ws-heading">
            <CardHeader>
              <CardTitle
                id="another-ws-heading"
                className="text-base"
                role="heading"
                aria-level={2}
              >
                別の Workspace を作成
              </CardTitle>
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
