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
      <header
        className="flex items-center justify-between"
        aria-label="最強TODO ホーム"
        /* iter2073: ホーム header landmark の hover で site context disclose (workspace nav
           iter1963 / main iter1965 と同 landmark hover summary pattern)。 */
        title="最強TODO ホーム"
      >
        <h1 className="text-3xl font-bold">最強TODO</h1>
        <form
          aria-label="ログアウト"
          /* iter2395: home page logout form の aria-label "ログアウト" は SR に form 用途を
             渡すが browser tooltip にならず sighted は hover で form 用途 (= 単一 logout
             action 用 form、内部 server action 経由で session 破棄 → /login redirect) 把握
             不可。proposal-edit-form iter2347 / Goal 作成 form iter2045 と同 form landmark
             title sync pattern を logout form にも展開、auth flow form 群 (login / signup /
             mock-login + logout) form-level title family 拡張。 */
          title="ログアウト"
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
              visible / 機能は不変、voice control prefix-match も維持。
              iter1781: visible text "ログアウト" のみで sighted は hover で遷移先 (= aria-label
              の "ログイン画面に戻る") 即把握できなかった (aria-label は browser tooltip にならない)。
              iter1777 view-switcher / iter1779 workspace nav と同 pattern を home page logout
              button にも展開、`title={同 aria-label}` 付与で sighted hover で遷移先 disclose。 */}
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="min-h-11"
            data-testid="logout-btn"
            aria-label="ログアウト — ログイン画面に戻る"
            title="ログアウト — ログイン画面に戻る"
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
          <ul
            className="space-y-2"
            aria-label="参加している Workspace 一覧"
            /* iter2267: 参加している Workspace 一覧 ul の aria-label は browser tooltip に
               ならず sighted は hover で「Workspace 一覧」 context disclose 不可。MCP path A で
               / 画面 (home / Workspaces 一覧画面) 探索中に発見、Template 一覧 iter2261 /
               sources-list iter2191 / Goal 一覧 iter2195 と同 一覧 ul family title pattern を
               最 上位 Workspace home 画面にも展開、5 entity 一覧 ul family 完成。 */
            title="参加している Workspace 一覧"
          >
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
                  // iter1839: aria-label のみで sighted は hover で workspace slug / role context
                  // 即把握できず (内側 div は aria-hidden="true")。iter1837 forecast chip と同
                  // pattern を workspace-link にも展開、`title={同 aria-label}` で hover disclose。
                  title={`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`}
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
