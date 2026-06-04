import Link from 'next/link'
import { redirect } from 'next/navigation'

import { requireWorkspaceMember } from '@/lib/auth/guard'
import { withUserDb } from '@/lib/db/scoped-client'
import { AuthError, PermissionError } from '@/lib/errors'

import { notificationService } from '@/features/notification/service'
import { findMyWorkspaces } from '@/features/workspace/repository'

import { GlobalShortcuts } from '@/components/shared/global-shortcuts'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { ActiveTimerPanel } from '@/components/workspace/active-timer-panel'
import { HeartbeatButton } from '@/components/workspace/heartbeat-button'
import { ItemsBoard } from '@/components/workspace/items-board'
import { NotificationBell } from '@/components/workspace/notification-bell'
import { NotificationPreferencesButton } from '@/components/workspace/notification-preferences'
import { TeamCapacityPanel } from '@/components/workspace/team-capacity-panel'
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

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params
  const { user, role } = await loadAccess(workspaceId)

  const workspaces = await withUserDb(user.id, (tx) => findMyWorkspaces(tx, user.id))
  const workspace = workspaces.find((w) => w.id === workspaceId)
  const displayName = workspace?.name ?? 'Workspace'

  // Bell の初期未読件数を SSR 時に取得 (client polling を避けて Realtime のみで更新)
  const unreadResult = await notificationService.unreadCount(workspaceId)
  const initialUnreadCount = unreadResult.ok ? unreadResult.value : 0

  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="Workspace dashboard — Today / Inbox / Kanban / Backlog / Gantt / Dashboard"
      className="container mx-auto max-w-5xl space-y-6 p-4 focus-visible:outline-none md:p-6"
    >
      <WorkspaceHeader
        title={displayName}
        role={role}
        subtitle={user.email ?? ''}
        pageActions={
          <>
            <HeartbeatButton workspaceId={workspaceId} />
            <nav
              aria-label="ワークスペース内 — Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive"
              className="flex flex-wrap items-center gap-2"
              /* iter1963: nav 全体に title を付与し sighted hover で sub-section 一覧 disclose
                 (個別 nav link は iter1779 で title 付き、nav landmark の summary は title 無)。 */
              title="ワークスペース内 — Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive"
            >
              {/* iter1731: 8 nav Link に data-testid 一括付与で Playwright `[data-testid^="nav-"]`
                  で workspace nav 一括発見、各 view 遷移 test を `[data-testid="nav-{section}"]`
                  で書ける。iter1730 back-to-workspaces / iter1716 offline / iter1728 skip-link
                  と同 data-testid sweep pattern。aria-label / href / visible text 全て不変。
                  iter1779: 8 nav Link は visible text ("Goals" 等) のみで sighted hover で
                  遷移先の descriptive context (= aria-label の "Sprint 計画 → 稼働 → 完了 ページへ移動" 等)
                  即把握できなかった。iter1777 view-switcher と同 pattern を nav にも展開、
                  `title={同 aria-label}` 付与で sighted hover で nav 各 link の遷移先 context disclose。 */}
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/goals`}
                  aria-label="Goals — OKR / Goals (Objective + Key Results) ページへ移動"
                  title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"
                  data-testid="nav-goals"
                >
                  Goals
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/sprints`}
                  aria-label="Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動"
                  title="Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動"
                  data-testid="nav-sprints"
                >
                  Sprints
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/pdca`}
                  aria-label="PDCA — Plan / Do / Check / Act + Lead time ページへ移動"
                  title="PDCA — Plan / Do / Check / Act + Lead time ページへ移動"
                  data-testid="nav-pdca"
                >
                  PDCA
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/templates`}
                  aria-label="Templates — ワークパッケージ定義 ページへ移動"
                  title="Templates — ワークパッケージ定義 ページへ移動"
                  data-testid="nav-templates"
                >
                  Templates
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/workflows`}
                  aria-label="Workflows — 自動化ワークフロー (n8n 風) ページへ移動"
                  title="Workflows — 自動化ワークフロー (n8n 風) ページへ移動"
                  data-testid="nav-workflows"
                >
                  Workflows
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/integrations`}
                  aria-label="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"
                  title="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"
                  data-testid="nav-integrations"
                >
                  API 連携
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/time-entries`}
                  aria-label="Time Entries — 稼働入力 やったこと + 時間を記録 ページへ移動"
                  title="Time Entries — 稼働入力 やったこと + 時間を記録 ページへ移動"
                  data-testid="nav-time-entries"
                >
                  Time Entries
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                <Link
                  href={`/${workspaceId}/archive`}
                  aria-label="Archive — アーカイブ済 Item 一覧 ページへ移動"
                  title="Archive — アーカイブ済 Item 一覧 ページへ移動"
                  data-testid="nav-archive"
                >
                  Archive
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="min-h-11">
                {/* iter1540: 旧 aria-label `"Workspace 一覧へ戻る"` は visible "一覧" を中位置
                    "Workspace **一覧** へ戻る" に持ち voice control prefix-matching「click 一覧」
                    が strict prefix-match で不可 (substring 一致のみ)。iter1093-1539 sweep
                    convention に揃え visible "一覧" 冒頭固定 + em-dash 区切で descriptive 末尾保持。
                    iter1730: data-testid 付与で Playwright が workspace ↔ list 遷移を標準
                    selector で test 可能 (iter1728 skip-link / iter1716 offline link 同 pattern)。 */}
                <Link
                  href="/"
                  aria-label="一覧 — Workspace 一覧へ戻る"
                  title="一覧 — Workspace 一覧へ戻る"
                  data-testid="back-to-workspaces"
                >
                  <span aria-hidden="true">← 一覧</span>
                </Link>
              </Button>
            </nav>
          </>
        }
        utility={
          <>
            <NotificationBell
              workspaceId={workspaceId}
              currentUserId={user.id}
              initialUnreadCount={initialUnreadCount}
            />
            <NotificationPreferencesButton />
            <ThemeToggle />
          </>
        }
      />

      <GlobalShortcuts workspaceId={workspaceId} />
      <TeamCapacityPanel workspaceId={workspaceId} />
      <ItemsBoard workspaceId={workspaceId} currentUserId={user.id} />
      <ActiveTimerPanel workspaceId={workspaceId} />
    </main>
  )
}
