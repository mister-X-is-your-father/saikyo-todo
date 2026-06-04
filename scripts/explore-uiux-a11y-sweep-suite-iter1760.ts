/**
 * Phase 6.15 loop iter1760: 包括 a11y invariant test suite (iter1714-1759 sweep の
 * 統合 regression guard、43 個 codify scripts の cross-file invariant を 1 file に集約)。
 *
 * 目的:
 *  iter1714-1759 で複数 file に展開した polish (title sweep / data-testid sweep /
 *  em-dash convention / reduced-motion / ID prefix 等) は各 iter の codify script で
 *  個別に regression check されているが、cross-file の総合 invariant が散在。本 suite
 *  で 1 file に集約することで:
 *    - 単一の `pnpm tsx` で全 sweep status を一括 verify
 *    - 新規 contributor が「現在の polish baseline」を 1 file で把握可能
 *    - 各 individual codify が break しても本 suite で漏れ検出
 *
 * 検査軸 (sweep カテゴリ):
 *  A. data-testid sweep (Playwright auth-flow / mock-timesheet / workspace nav 等)
 *  B. title sweep (truncate / line-clamp 全 entity の sighted hover disclosure)
 *  C. em-dash visible-prefix convention (aria-label 統一)
 *  D. ID prefix normalization (login-form / signup-form / mock-timesheet)
 *  E. WCAG 2.3.3 reduced-motion (focus + scroll behavior)
 *  F. WCAG 1.3.1 table semantics (th scope="row"/col)
 *  G. WCAG 2.4.1 skip-link
 *  H. workspace-header / page metadata
 *
 * 実行: pnpm tsx scripts/explore-uiux-a11y-sweep-suite-iter1760.ts
 * 前提: なし (source 直読 invariant、Supabase 不要)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

function read(here: string, path: string): string {
  return readFileSync(resolve(here, path), 'utf8')
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const root = '..'

  // ========= A. data-testid sweep =========
  // A.1 auth forms (iter1725)
  const loginForm = read(here, `${root}/src/components/auth/login-form.tsx`)
  const signupForm = read(here, `${root}/src/components/auth/signup-form.tsx`)
  for (const [src, tid] of [
    [loginForm, 'login-form'],
    [loginForm, 'login-submit'],
    [signupForm, 'signup-form'],
    [signupForm, 'signup-submit'],
  ] as const) {
    if (!src.includes(`data-testid="${tid}"`)) {
      findings.push({
        level: 'error',
        source: 'A.data-testid',
        message: `[A] auth form data-testid="${tid}" が消えている`,
      })
    }
  }

  // A.2 auth pages link symmetry (iter1714 / 既存 login)
  const signupPage = read(here, `${root}/src/app/(auth)/signup/page.tsx`)
  if (!signupPage.includes('data-testid="login-link"')) {
    findings.push({
      level: 'error',
      source: 'A.data-testid',
      message: '[A] iter1714 signup/page.tsx login-link data-testid が消えている',
    })
  }

  // A.3 offline action data-testid (iter1716)
  const offlinePage = read(here, `${root}/src/app/~offline/page.tsx`)
  const retryButton = read(here, `${root}/src/app/~offline/retry-button.tsx`)
  if (
    !offlinePage.includes('data-testid="offline-home-link"') ||
    !retryButton.includes('data-testid="offline-retry-button"')
  ) {
    findings.push({
      level: 'error',
      source: 'A.data-testid',
      message: '[A] iter1716 offline 復帰アクション data-testid が消えている',
    })
  }

  // A.4 mock-timesheet 全要素 (iter1717 / 1757 / 1758 / 1759)
  const mockLoginForm = read(here, `${root}/src/components/mock-timesheet/mock-login-form.tsx`)
  const mockTopNav = read(here, `${root}/src/components/mock-timesheet/mock-top-nav.tsx`)
  const mockSubmitForm = read(here, `${root}/src/components/mock-timesheet/mock-submit-form.tsx`)
  for (const [src, tid, fileLabel] of [
    [mockLoginForm, 'mock-login-form', 'mock-login-form'],
    [mockLoginForm, 'mock-login-submit', 'mock-login-form'],
    [mockLoginForm, 'mock-login-seed', 'mock-login-form'],
    [mockTopNav, 'mock-nav-new', 'mock-top-nav'],
    [mockTopNav, 'mock-nav-entries', 'mock-top-nav'],
    [mockSubmitForm, 'mock-submit-form', 'mock-submit-form'],
    [mockSubmitForm, 'mock-submit-action', 'mock-submit-form'],
  ] as const) {
    if (!src.includes(`data-testid="${tid}"`)) {
      findings.push({
        level: 'error',
        source: 'A.data-testid',
        message: `[A] ${fileLabel} data-testid="${tid}" が消えている`,
      })
    }
  }

  // A.5 root layout (iter1728 / 1729)
  const rootLayout = read(here, `${root}/src/app/layout.tsx`)
  for (const tid of ['skip-to-main', 'noscript-warning']) {
    if (!rootLayout.includes(`data-testid="${tid}"`)) {
      findings.push({
        level: 'error',
        source: 'A.data-testid',
        message: `[A] root layout data-testid="${tid}" が消えている`,
      })
    }
  }

  // A.6 workspace page back-to-list + nav 8 link (iter1730 / 1731)
  const workspacePage = read(here, `${root}/src/app/(workspace)/[workspaceId]/page.tsx`)
  if (!workspacePage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'A.data-testid',
      message: '[A] iter1730 back-to-workspaces data-testid が消えている',
    })
  }
  const navTestIds = (workspacePage.match(/data-testid="nav-[a-z-]+"/g) ?? []).length
  if (navTestIds !== 8) {
    findings.push({
      level: 'error',
      source: 'A.data-testid',
      message: `[A] iter1731 workspace nav-* data-testid 件数 ${navTestIds} (期待 8)`,
    })
  }

  // ========= B. title sweep (truncate / line-clamp) =========
  const titleSweepFiles = [
    [
      `${root}/src/app/mock-timesheet/entries/page.tsx`,
      'title={e.description}',
      'mock-entries description',
    ],
    [
      `${root}/src/components/time-entry/time-entries-table.tsx`,
      "title={e.description || ''}",
      'time-entries description',
    ],
    // iter2225: op-board ItemRow title を `title={item.title}` から `title={ariaLabel}` に変更し
    // aria-label と sync (statePrefix + 期限 + 編集ダイアログで開く context を sighted hover に disclose)。
    [
      `${root}/src/components/workspace/operation-board-widget.tsx`,
      'title={ariaLabel}',
      'operation-board',
    ],
    [`${root}/src/components/workspace/taskchute-view.tsx`, 'title={item.title}', 'taskchute'],
    // iter2155: inbox-view item button title を `title={it.title}` から
    // `title={`${it.title} — 編集ダイアログで開く`}` に変更し aria-label と sync。
    [
      `${root}/src/components/workspace/inbox-view.tsx`,
      'title={`${it.title} — 編集ダイアログで開く`}',
      'inbox',
    ],
    // iter2153: today-view item button title を `title={it.title}` から
    // `title={`${it.title} — 編集`}` に変更し aria-label と sync。
    [`${root}/src/components/workspace/today-view.tsx`, 'title={`${it.title} — 編集`}', 'today'],
    // iter2151: personal-period item button title を `title={it.title}` から
    // `title={`${it.title} — 編集`}` に変更し aria-label と sync。
    [
      `${root}/src/components/workspace/personal-period-view.tsx`,
      'title={`${it.title} — 編集`}',
      'period',
    ],
    [
      `${root}/src/components/workspace/archived-items-panel.tsx`,
      'title={item.title}',
      'archived-items',
    ],
    [
      `${root}/src/components/workspace/sprints-panel.tsx`,
      'title={sprint.name}',
      'sprints CardTitle',
    ],
    [`${root}/src/components/workspace/sprints-panel.tsx`, 'title={sprint.goal}', 'sprints goal'],
    [`${root}/src/components/workspace/goals-panel.tsx`, 'title={goal.title}', 'goals CardTitle'],
    [
      `${root}/src/components/workspace/goals-panel.tsx`,
      'title={goal.description}',
      'goals description',
    ],
    [`${root}/src/components/workflow/workflows-panel.tsx`, 'title={wf.name}', 'workflows'],
    [
      `${root}/src/components/workflow/workflows-panel.tsx`,
      'title={wf.description}',
      'workflows description',
    ],
    [
      `${root}/src/components/integrations/integrations-panel.tsx`,
      'title={src.name}',
      'integrations',
    ],
    [
      `${root}/src/components/template/template-items-editor.tsx`,
      'title={it.title}',
      'template-items',
    ],
    [`${root}/src/components/workspace/gantt-view.tsx`, 'title={item.title}', 'gantt 左列'],
    [
      `${root}/src/components/sprint/sprint-risk-board-widget.tsx`,
      'title={load.name}',
      'sprint-risk-board assigneeLoad',
    ],
    // iter2145: dashboard MUST item button title を `title={item.title}` から
    // `title={`${item.title} — MUST item を編集`}` に変更し aria-label と sync。
    [
      `${root}/src/components/workspace/dashboard-view.tsx`,
      'title={`${item.title} — MUST item を編集`}',
      'dashboard MUST',
    ],
    [`${root}/src/components/workspace/dashboard-view.tsx`, 'title={item.dod}', 'dashboard DoD'],
    // iter2223: proposal title button の title を `title={proposal.title}` から
    // `title={`${proposal.title} — 提案を編集 (MUST?)`}` に変更し aria-label と sync。
    [
      `${root}/src/components/workspace/decompose-proposals-panel.tsx`,
      "title={`${proposal.title} — 提案を編集${proposal.isMust ? ' (MUST)' : ''}`}",
      'decompose proposal',
    ],
    [
      `${root}/src/components/workspace/decompose-proposals-panel.tsx`,
      'title={proposal.description}',
      'decompose description',
    ],
    [
      `${root}/src/components/workspace/workspace-header.tsx`,
      'title={title}',
      'workspace-header h1',
    ],
    [
      `${root}/src/components/workspace/workspace-header.tsx`,
      'title={subtitle}',
      'workspace-header subtitle',
    ],
    [
      `${root}/src/components/shared/command-palette.tsx`,
      'title={item.title}',
      'command-palette CommandItem',
    ],
    [`${root}/src/components/workspace/subtasks-panel.tsx`, 'title={item.title}', 'subtasks-panel'],
    [
      `${root}/src/components/workspace/item-dependencies-panel.tsx`,
      'title={ref.title}',
      'item-dependencies',
    ],
    [
      `${root}/src/components/workspace/quick-add.tsx`,
      'title={preview.title}',
      'quick-add preview',
    ],
    [
      `${root}/src/components/workspace/item-edit-dialog.tsx`,
      'title={item.title}',
      'ItemEditDialog',
    ],
    // iter2161: schedule-item-picker item button title を `title={it.title}` から
    // `title={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}` に変更し aria-label と sync。
    [
      `${root}/src/components/schedule/schedule-item-picker.tsx`,
      "title={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}",
      'schedule-item-picker',
    ],
    [
      `${root}/src/components/schedule/timeline-lane.tsx`,
      'title={fullLabel}',
      'timeline-lane EventBlock',
    ],
  ] as const
  for (const [path, needle, label] of titleSweepFiles) {
    const src = read(here, path)
    if (!src.includes(needle)) {
      findings.push({
        level: 'error',
        source: 'B.title',
        message: `[B] ${label} の ${needle} が消えている`,
      })
    }
  }

  // ========= C. em-dash visible-prefix convention =========
  if (
    !loginForm.includes("'ログイン — メール + パスワードで認証'") ||
    !signupForm.includes("'サインアップ — アカウントを作成'")
  ) {
    findings.push({
      level: 'error',
      source: 'C.em-dash',
      message: '[C] auth form em-dash aria-label convention が消えている',
    })
  }
  const homePage = read(here, `${root}/src/app/page.tsx`)
  if (!homePage.includes('aria-label="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'C.em-dash',
      message: '[C] iter1724 home page logout em-dash aria-label が消えている',
    })
  }
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'C.em-dash',
      message: '[C] iter1718 mock-top-nav logout brief aria-label が消えている',
    })
  }

  // ========= D. ID prefix normalization =========
  for (const id of ['login-email-error', 'login-password-error']) {
    if (!loginForm.includes(`id="${id}"`)) {
      findings.push({
        level: 'error',
        source: 'D.id-prefix',
        message: `[D] iter1715 login-form id="${id}" が消えている`,
      })
    }
  }
  for (const id of [
    'signup-email-error',
    'signup-password-error',
    'signup-displayName-hint',
    'signup-displayName-error',
  ]) {
    if (!signupForm.includes(`id="${id}"`)) {
      findings.push({
        level: 'error',
        source: 'D.id-prefix',
        message: `[D] signup-form id="${id}" が消えている`,
      })
    }
  }

  // ========= E. WCAG 2.3.3 reduced-motion =========
  const reducedMotionHelper = read(here, `${root}/src/lib/ui/prefers-reduced-motion.ts`)
  if (!reducedMotionHelper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'E.reduced-motion',
      message: '[E] iter1732 prefers-reduced-motion helper が消えている',
    })
  }
  const focusUtil = read(here, `${root}/src/lib/ui/focus-quick-add.ts`)
  const ganttView = read(here, `${root}/src/components/workspace/gantt-view.tsx`)
  if (
    !focusUtil.includes("from './prefers-reduced-motion'") ||
    !ganttView.includes("from '@/lib/ui/prefers-reduced-motion'")
  ) {
    findings.push({
      level: 'error',
      source: 'E.reduced-motion',
      message:
        '[E] focus-quick-add or gantt-view が prefers-reduced-motion helper を import してない',
    })
  }

  // ========= F. WCAG 1.3.1 table semantics =========
  const mockEntries = read(here, `${root}/src/app/mock-timesheet/entries/page.tsx`)
  if (!mockEntries.includes('scope="row"')) {
    findings.push({
      level: 'error',
      source: 'F.table',
      message: '[F] iter1721 mock-entries body <th scope="row"> が消えている',
    })
  }

  // ========= I. shared SeverityChip title (iter1761) =========
  const severityChip = read(here, `${root}/src/components/shared/severity-chip.tsx`)
  const severityTitleCount = (severityChip.match(/title=\{ariaLabel \?\? label\}/g) ?? []).length
  if (severityTitleCount !== 2) {
    findings.push({
      level: 'error',
      source: 'I.severity-chip',
      message: `[I] iter1761 SeverityChip title 件数が ${severityTitleCount} (期待 2: button + static)`,
    })
  }

  // ========= J. icon-only button title sweep (iter1763 / 1764 / 1765, iter1971 で em-dash 化) =========
  const themeToggle = read(here, `${root}/src/components/shared/theme-toggle.tsx`)
  if (!themeToggle.includes("'ライトテーマ — クリックで切替' : 'ダークテーマ — クリックで切替'")) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1763/1971 theme-toggle conditional title が消えている',
    })
  }
  const notifBell = read(here, `${root}/src/components/workspace/notification-bell.tsx`)
  if (!notifBell.includes('title={`通知 — 未読 ${unreadCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1764 notification-bell title が消えている',
    })
  }
  const notifPrefs = read(here, `${root}/src/components/workspace/notification-preferences.tsx`)
  if (
    !notifPrefs.match(
      /title=\{\s*\n?\s*onCount !== null[\s\S]{0,300}'通知設定 — メール通知 4 種を ON\/OFF'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1764 notification-preferences title が消えている',
    })
  }
  const calendarView = read(here, `${root}/src/components/schedule/calendar-view.tsx`)
  if (
    !calendarView.includes("title={`前日 — ${format(subDays(date, 1), 'M月d日 (eee)')} を表示`}") ||
    !calendarView.includes("title={`翌日 — ${format(addDays(date, 1), 'M月d日 (eee)')} を表示`}")
  ) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1765 calendar-view prev/next title が消えている',
    })
  }
  if (
    !calendarView.includes(
      "title={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1775 calendar-view today title が消えている',
    })
  }

  // ========= L. items-board view-switcher title sweep (iter1777) =========
  const itemsBoard = read(here, `${root}/src/components/workspace/items-board.tsx`)
  const viewSwitcherTitleCount = (
    itemsBoard.match(
      /title="(Today|Inbox|Kanban|Backlog|Gantt|Dashboard|日次レビュー画面|週次レビュー画面|月次レビュー画面)/g,
    ) ?? []
  ).length
  if (viewSwitcherTitleCount !== 9) {
    findings.push({
      level: 'error',
      source: 'L.view-switcher',
      message: `[L] iter1777 items-board view-switcher title 件数が ${viewSwitcherTitleCount} (期待 9)`,
    })
  }

  // ========= M. workspace nav 8 Link title sweep (iter1779) =========
  const wsNavTitleCount = (
    workspacePage.match(
      /title="(Goals|Sprints|PDCA|Templates|Workflows|API 連携|Time Entries|Archive)/g,
    ) ?? []
  ).length
  if (wsNavTitleCount !== 8) {
    findings.push({
      level: 'error',
      source: 'M.workspace-nav',
      message: `[M] iter1779 workspace nav 8 Link title 件数が ${wsNavTitleCount} (期待 8)`,
    })
  }

  // ========= O. sprint-risk-board topRisk button title sweep (iter1783) =========
  const riskBoard = read(here, `${root}/src/components/sprint/sprint-risk-board-widget.tsx`)
  if (!riskBoard.includes('title={`${entry.item.title} を開く — risk score ${entry.riskScore}${')) {
    findings.push({
      level: 'error',
      source: 'O.risk-board-title',
      message: '[O] iter1783 sprint-risk-board topRisk button title が消えている',
    })
  }

  // ========= P. ItemEditDialog footer cancel + save title sweep (iter1785) =========
  const itemEditDialog = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!itemEditDialog.includes('title={`キャンセル — 「${item.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'P.dialog-footer',
      message: '[P] iter1785 ItemEditDialog cancel button title が消えている',
    })
  }
  const dialogTitleCount = (itemEditDialog.match(/\btitle=\{/g) ?? []).length
  if (dialogTitleCount < 3) {
    findings.push({
      level: 'error',
      source: 'P.dialog-footer',
      message: `[P] iter1785 ItemEditDialog title 件数が ${dialogTitleCount} (期待 >= 3: header + cancel + save)`,
    })
  }

  // ========= Q. ItemEditDialog archive/unarchive title sweep (iter1787) =========
  if (
    !itemEditDialog.includes('`復元中… — 「${item.title}」をアーカイブから復元中`') ||
    !itemEditDialog.includes('`アーカイブ復元 — 「${item.title}」をアーカイブから復元`') ||
    !itemEditDialog.includes('`アーカイブ中… — 「${item.title}」をアーカイブ中…`') ||
    !itemEditDialog.includes('`アーカイブ — 「${item.title}」をアーカイブ (後で復元可能)`')
  ) {
    findings.push({
      level: 'error',
      source: 'Q.dialog-archive',
      message: '[Q] iter1787 ItemEditDialog archive/unarchive conditional path text が消えている',
    })
  }
  if (dialogTitleCount < 5) {
    findings.push({
      level: 'error',
      source: 'Q.dialog-archive',
      message: `[Q] iter1787 ItemEditDialog title 件数が ${dialogTitleCount} (期待 >= 5: header + cancel + save + archive + unarchive)`,
    })
  }

  // ========= R. comment-thread 4 button title sweep (iter1789) =========
  const commentThread = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (!commentThread.includes('title="キャンセル — コメントの編集を破棄"')) {
    findings.push({
      level: 'error',
      source: 'R.comment-thread',
      message: '[R] iter1789 comment-edit-cancel title が消えている',
    })
  }
  const commentTitleCount = (commentThread.match(/\btitle=(\{|")/g) ?? []).length
  if (commentTitleCount < 4) {
    findings.push({
      level: 'error',
      source: 'R.comment-thread',
      message: `[R] iter1789 comment-thread title 件数が ${commentTitleCount} (期待 >= 4: cancel + save + edit + delete)`,
    })
  }

  // ========= S. submit buttons title sweep (iter1791) =========
  // comment-post (3 path) + quick-add-submit (4 path) — sighted hover disclosure
  if (
    !commentThread.includes("'投稿 — コメントを投稿 (Cmd/Ctrl+Enter でも可、@user で言及・通知)'")
  ) {
    findings.push({
      level: 'error',
      source: 'S.submit-buttons',
      message: '[S] iter1791 comment-post default path text が消えている',
    })
  }
  if (commentTitleCount < 5) {
    findings.push({
      level: 'error',
      source: 'S.submit-buttons',
      message: `[S] iter1791 comment-thread title 件数が ${commentTitleCount} (期待 >= 5 含む post)`,
    })
  }
  const quickAdd = read(here, `${root}/src/components/workspace/quick-add.tsx`)
  if (!quickAdd.includes('`作成 — 「${preview.title}」を作成 (Enter でも可)`')) {
    findings.push({
      level: 'error',
      source: 'S.submit-buttons',
      message: '[S] iter1791 quick-add-submit default path text が消えている',
    })
  }
  const quickAddTitleCount = (quickAdd.match(/\btitle=(\{|")/g) ?? []).length
  if (quickAddTitleCount < 2) {
    findings.push({
      level: 'error',
      source: 'S.submit-buttons',
      message: `[S] iter1791 quick-add title 件数が ${quickAddTitleCount} (期待 >= 2: preview + submit)`,
    })
  }

  // ========= T. active-timer pause/resume/stop title sweep (iter1793) =========
  const activeTimer = read(here, `${root}/src/components/workspace/active-timer-panel.tsx`)
  if (
    !activeTimer.includes('title="一時停止 — タイマーを一時停止"') ||
    !activeTimer.includes('title="再開 — タイマーを再開"')
  ) {
    findings.push({
      level: 'error',
      source: 'T.active-timer',
      message: '[T] iter1793 active-timer pause/resume title が消えている',
    })
  }
  if (
    !activeTimer.includes("'停止 — タイマーを停止して稼働記録に保存'") ||
    !activeTimer.includes("'停止 — タイマーを停止して稼働記録を作成中…'")
  ) {
    findings.push({
      level: 'error',
      source: 'T.active-timer',
      message: '[T] iter1793 active-timer stop conditional 2 path text が消えている',
    })
  }

  // ========= U. auth submit button title sweep (iter1795) =========
  if (
    !loginForm.includes("'ログイン — メール + パスワードで認証'") ||
    !loginForm.includes("'ログイン中… — 認証処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'U.auth-submit',
      message: '[U] iter1795 login-submit conditional 2 path text が消えている',
    })
  }
  if (
    !signupForm.includes("'サインアップ — アカウントを作成'") ||
    !signupForm.includes("'作成中… — サインアップ処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'U.auth-submit',
      message: '[U] iter1795 signup-submit conditional 2 path text が消えている',
    })
  }
  const loginTitleCount = (loginForm.match(/\btitle=\{/g) ?? []).length
  const signupTitleCount = (signupForm.match(/\btitle=\{/g) ?? []).length
  if (loginTitleCount < 1 || signupTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'U.auth-submit',
      message: `[U] iter1795 auth form title 件数 login=${loginTitleCount} signup=${signupTitleCount} (各 >=1 期待)`,
    })
  }

  // ========= V. mock-timesheet submit button title sweep (iter1797) =========
  if (
    !mockLoginForm.includes("'ログイン — mock-timesheet email + password で認証'") ||
    !mockLoginForm.includes("'認証中… — mock-timesheet 認証処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'V.mock-submit',
      message: '[V] iter1797 mock-login-submit conditional 2 path text が消えている',
    })
  }
  if (
    !mockSubmitForm.includes("'送信 — 工数を送信 (mock-timesheet 入力フォーム)'") ||
    !mockSubmitForm.includes("'送信中… — mock-timesheet 工数送信処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'V.mock-submit',
      message: '[V] iter1797 mock-submit-action conditional 2 path text が消えている',
    })
  }
  const mockLoginTitleCount = (mockLoginForm.match(/\btitle=\{/g) ?? []).length
  const mockSubmitTitleCount = (mockSubmitForm.match(/\btitle=\{/g) ?? []).length
  if (mockLoginTitleCount < 1 || mockSubmitTitleCount < 1) {
    findings.push({
      level: 'error',
      source: 'V.mock-submit',
      message: `[V] iter1797 mock form title 件数 login=${mockLoginTitleCount} submit=${mockSubmitTitleCount} (各 >=1 期待)`,
    })
  }

  // ========= AF. goal-toggle title sweep (iter1817) =========
  const goalsPanelAF = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  // AG. kr-add-btn title (iter1819) — 同 file
  if (!goalsPanelAF.includes("'KR 追加 — Key Result をこの Goal に追加'")) {
    findings.push({
      level: 'error',
      source: 'AG.kr-add',
      message: '[AG] iter1819 kr-add-btn default title が消えている',
    })
  }
  // AF. goal-toggle title check 続き
  if (
    !goalsPanelAF.includes(
      "title={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AF.goal-toggle',
      message: '[AF] iter1817 goal-toggle title が消えている',
    })
  }

  // ========= AE. src-* actions title sweep (iter1815) =========
  const integrationsPanel = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  for (const t of [
    '`無効化 — Source「${src.name}」を無効化`',
    '`履歴 — Source「${src.name}」の Pull 履歴 (直近 5 件) を表示`',
    '`削除 — Source「${src.name}」を削除`',
  ]) {
    if (!integrationsPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'AE.src-actions',
        message: `[AE] iter1815 src-* conditional path text ${t} が消えている`,
      })
    }
  }

  // ========= AD. wf-* actions title sweep (iter1813) =========
  const wfPanelAD = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  // wf-edit static
  if (!wfPanelAD.includes('title={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}')) {
    findings.push({
      level: 'error',
      source: 'AD.wf-actions',
      message: '[AD] iter1813 wf-edit title が消えている',
    })
  }
  // wf-toggle / wf-runs-toggle / wf-delete conditional の sample text 維持
  for (const t of [
    '`無効化 — Workflow「${wf.name}」を無効化`',
    '`有効化 — Workflow「${wf.name}」を有効化`',
    '`履歴 — Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示`',
    '`削除 — Workflow「${wf.name}」を削除`',
  ]) {
    if (!wfPanelAD.includes(t)) {
      findings.push({
        level: 'error',
        source: 'AD.wf-actions',
        message: `[AD] iter1813 wf-* conditional path text ${t} が消えている`,
      })
    }
  }

  // ========= AC. template-create + wf-create title sweep (iter1811) =========
  const templatePanel = read(here, `${root}/src/components/template/templates-panel.tsx`)
  const wfPanel = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !templatePanel.includes("'作成 — Template を新規作成 (Cmd/Ctrl+Enter でも可)'") ||
    !templatePanel.includes("'作成 — Template を作成中…'")
  ) {
    findings.push({
      level: 'error',
      source: 'AC.template-wf-create',
      message: '[AC] iter1811 template-create conditional path text が消えている',
    })
  }
  if (
    !wfPanel.includes("'作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'") ||
    !wfPanel.includes("'作成中… — Workflow を作成中'")
  ) {
    findings.push({
      level: 'error',
      source: 'AC.template-wf-create',
      message: '[AC] iter1811 wf-create conditional path text が消えている',
    })
  }

  // ========= AB. sprint-create + goal-create title sweep (iter1809) =========
  const sprintsPanel = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  const goalsPanel = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (
    !sprintsPanel.includes("'作成 — Sprint を新規作成'") ||
    !sprintsPanel.includes("'作成中… — Sprint を作成中'")
  ) {
    findings.push({
      level: 'error',
      source: 'AB.sprint-goal-create',
      message: '[AB] iter1809 sprint-create conditional path text が消えている',
    })
  }
  if (
    !goalsPanel.includes("'作成 — Goal を新規作成'") ||
    !goalsPanel.includes("'作成中… — Goal を作成中'")
  ) {
    findings.push({
      level: 'error',
      source: 'AB.sprint-goal-create',
      message: '[AB] iter1809 goal-create conditional path text が消えている',
    })
  }

  // ========= JR. Sprint Swimlane lane chip title sweep (iter2307) =========
  const ssdJR = read(here, `${root}/src/components/workspace/sprint-swimlane-disclosure.tsx`)
  if (
    !ssdJR.includes('iter2307') ||
    !ssdJR.includes('title={`${row.loadSummaryJa} — lane / ${row.conflictsJa}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'JR.swimlane-lane-chip-title',
      message: '[JR] iter2307 Sprint Swimlane lane chip title sync が消えている',
    })
  }

  // ========= JQ. Sprint Swimlane lane 一覧 ul title sweep (iter2305) =========
  const ssdJQ = read(here, `${root}/src/components/workspace/sprint-swimlane-disclosure.tsx`)
  if (
    !ssdJQ.includes('iter2305') ||
    !ssdJQ.includes('title={`Sprint Swimlane lane 一覧 — ${rows.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'JQ.swimlane-lane-ul-title',
      message: '[JQ] iter2305 Sprint Swimlane lane 一覧 ul title sync が消えている',
    })
  }

  // ========= JP. te-description / teMinutes input title sweep (iter2303) =========
  const teJP = read(here, `${root}/src/components/time-entry/create-time-entry-form.tsx`)
  if (!teJP.includes('iter2303')) {
    findings.push({
      level: 'error',
      source: 'JP.te-description-minutes-title',
      message: '[JP] iter2303 te-description / teMinutes input title sync が消えている',
    })
  }

  // ========= JO. pickers trigger empty path title sweep (iter2301) =========
  const apJO = read(here, `${root}/src/components/workspace/assignee-picker.tsx`)
  if (
    !apJO.includes('iter2301') ||
    !apJO.includes("'未アサイン — アサインを選択 (現在未アサイン)'")
  ) {
    findings.push({
      level: 'error',
      source: 'JO.assignee-picker-empty-title',
      message: '[JO] iter2301 assignee-picker trigger empty title が消えている',
    })
  }
  const tpJO = read(here, `${root}/src/components/workspace/tag-picker.tsx`)
  if (!tpJO.includes('iter2301') || !tpJO.includes("'タグなし — タグを選択 (現在なし)'")) {
    findings.push({
      level: 'error',
      source: 'JO.tag-picker-empty-title',
      message: '[JO] iter2301 tag-picker trigger empty title が消えている',
    })
  }

  // ========= JN. editStart / editDue date input title sweep (iter2299) =========
  const edJN = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJN.includes('iter2299')) {
    findings.push({
      level: 'error',
      source: 'JN.edit-start-due-date-title',
      message: '[JN] iter2299 editStart / editDue date input title 3-path sync が消えている',
    })
  }

  // ========= JM. editDescription textarea title sweep (iter2297) =========
  const edJM = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJM.includes('iter2297')) {
    findings.push({
      level: 'error',
      source: 'JM.edit-description-textarea-title',
      message: '[JM] iter2297 editDescription textarea title 3-path sync が消えている',
    })
  }

  // ========= JL. editTitle input title sweep (iter2295) =========
  const edJL = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJL.includes('iter2295')) {
    findings.push({
      level: 'error',
      source: 'JL.edit-title-input-title',
      message: '[JL] iter2295 editTitle input title 4-path sync が消えている',
    })
  }

  // ========= JK. activity-detail-toggle title sweep (iter2293) =========
  const alJK = read(here, `${root}/src/components/workspace/activity-log.tsx`)
  if (!alJK.includes('iter2293')) {
    findings.push({
      level: 'error',
      source: 'JK.activity-detail-toggle-title',
      message: '[JK] iter2293 activity-detail-toggle title 2-path sync が消えている',
    })
  }

  // ========= JJ. Activity 履歴 ul title sweep (iter2291) =========
  const alJJ = read(here, `${root}/src/components/workspace/activity-log.tsx`)
  if (!alJJ.includes('iter2291') || !alJJ.includes('title={`Activity 履歴 — ${data.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'JJ.activity-log-ul-title',
      message: '[JJ] iter2291 Activity 履歴 ul title sync が消えている',
    })
  }

  // ========= JI. 案件サマリ region root title sweep (iter2289) =========
  const ispJI = read(here, `${root}/src/components/workspace/item-summary-panel.tsx`)
  if (!ispJI.includes('iter2289') || !ispJI.includes('title={`案件サマリ${')) {
    findings.push({
      level: 'error',
      source: 'JI.item-summary-region-title',
      message: '[JI] iter2289 案件サマリ region root title sync が消えている',
    })
  }

  // ========= JH. edit-item-sprint / kr select title sweep (iter2287) =========
  const edJH = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJH.includes('iter2287')) {
    findings.push({
      level: 'error',
      source: 'JH.edit-item-sprint-kr-title',
      message: '[JH] iter2287 edit-item-sprint / kr select title sync が消えている',
    })
  }

  // ========= JG. ItemEditDialog TabsList title sweep (iter2285) =========
  const edJG = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJG.includes('iter2285') || !edJG.includes('title="Item 編集タブ"')) {
    findings.push({
      level: 'error',
      source: 'JG.item-edit-tabs-title',
      message: '[JG] iter2285 ItemEditDialog TabsList title sync が消えている',
    })
  }

  // ========= JF. kanban-title button title sweep (iter2283) =========
  const kvJF = read(here, `${root}/src/components/workspace/kanban-view.tsx`)
  if (!kvJF.includes('iter2283') || !kvJF.includes('title={`${item.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'JF.kanban-title-edit-title',
      message: '[JF] iter2283 kanban-title button title sync が消えている',
    })
  }

  // ========= JE. Kanban board root group title sweep (iter2281) =========
  const kvJE = read(here, `${root}/src/components/workspace/kanban-view.tsx`)
  if (
    !kvJE.includes('iter2281') ||
    !kvJE.includes('title={`Kanban ボード — ${statuses.length} 列`}')
  ) {
    findings.push({
      level: 'error',
      source: 'JE.kanban-root-title',
      message: '[JE] iter2281 Kanban board root group title sync が消えている',
    })
  }

  // ========= JD. backlog-edit button title sweep (iter2279) =========
  const bvJD = read(here, `${root}/src/components/workspace/backlog-view.tsx`)
  if (!bvJD.includes('iter2279')) {
    findings.push({
      level: 'error',
      source: 'JD.backlog-edit-title',
      message: '[JD] iter2279 backlog-edit button title sync が消えている',
    })
  }

  // ========= JC. backlog sortable th title sweep (iter2277) =========
  const bvJC = read(here, `${root}/src/components/workspace/backlog-view.tsx`)
  if (!bvJC.includes('iter2277')) {
    findings.push({
      level: 'error',
      source: 'JC.backlog-th-sort-title',
      message: '[JC] iter2277 backlog sortable th title sync が消えている',
    })
  }

  // ========= JB. today-view 期限 span title sweep (iter2275) =========
  const tvJB = read(here, `${root}/src/components/workspace/today-view.tsx`)
  if (!tvJB.includes('iter2275') || !tvJB.includes('title={`期限 ${it.dueDate}`}')) {
    findings.push({
      level: 'error',
      source: 'JB.today-due-title',
      message: '[JB] iter2275 today-view 期限 span title sync が消えている',
    })
  }

  // ========= JA. edit-item-must checkbox title sweep (iter2273) =========
  const edJA = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!edJA.includes('iter2273')) {
    findings.push({
      level: 'error',
      source: 'JA.edit-item-must-title',
      message: '[JA] iter2273 edit-item-must title 2-path sync が消えている',
    })
  }

  // ========= IZ. start-timer-button (idle) title full sync sweep (iter2271) =========
  const stbIZ = read(here, `${root}/src/components/workspace/start-timer-button.tsx`)
  if (
    !stbIZ.includes('iter2271') ||
    !stbIZ.includes('title={accessibleLabel}') ||
    stbIZ.includes('title={otherActive ? fullHint : undefined}')
  ) {
    findings.push({
      level: 'error',
      source: 'IZ.start-timer-title',
      message: '[IZ] iter2271 start-timer-button (idle) title full sync が消えている',
    })
  }

  // ========= IY. QuickAdd preview parent role=status title sweep (iter2269) =========
  const qaIY = read(here, `${root}/src/components/workspace/quick-add.tsx`)
  if (!qaIY.includes('iter2269') || !qaIY.includes('title={`解析結果 — ${previewSummary}`}')) {
    findings.push({
      level: 'error',
      source: 'IY.quickadd-preview-title',
      message: '[IY] iter2269 QuickAdd preview parent title sync が消えている',
    })
  }

  // ========= IX. 参加している Workspace 一覧 ul title sweep (iter2267) =========
  const homeIX = read(here, `${root}/src/app/page.tsx`)
  if (!homeIX.includes('iter2267') || !homeIX.includes('title="参加している Workspace 一覧"')) {
    findings.push({
      level: 'error',
      source: 'IX.workspaces-list-ul-title',
      message: '[IX] iter2267 参加している Workspace 一覧 ul title sync が消えている',
    })
  }

  // ========= IW. sprint-defaults-edit-btn title sweep (iter2265) =========
  const spIW = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spIW.includes('iter2265')) {
    findings.push({
      level: 'error',
      source: 'IW.sprint-defaults-edit-title',
      message: '[IW] iter2265 sprint-defaults-edit-btn title sync が消えている',
    })
  }

  // ========= IV. workspace-mode 3 option button title sweep (iter2263) =========
  const msIV = read(here, `${root}/src/components/workspace/workspace-mode-selector.tsx`)
  if (!msIV.includes('iter2263') || !msIV.includes('title={`${opt.label} — ${opt.description}`}')) {
    findings.push({
      level: 'error',
      source: 'IV.workspace-mode-option-title',
      message: '[IV] iter2263 workspace-mode option title sync が消えている',
    })
  }

  // ========= IU. Template 一覧 ul title sweep (iter2261) =========
  const tpIU = read(here, `${root}/src/components/template/templates-panel.tsx`)
  if (
    !tpIU.includes('iter2261') ||
    !tpIU.includes('title={`Template 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'IU.template-list-ul-title',
      message: '[IU] iter2261 Template 一覧 ul title sync が消えている',
    })
  }

  // ========= IT. Template 作成フォーム title sweep (iter2259) =========
  const tpIT = read(here, `${root}/src/components/template/templates-panel.tsx`)
  if (!tpIT.includes('iter2259') || !tpIT.includes('title="Template 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'IT.template-create-form-title',
      message: '[IT] iter2259 Template 作成フォーム title sync が消えている',
    })
  }

  // ========= IS. src-create-btn title 3-path sweep (iter2257) =========
  const ipIS = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (!ipIS.includes('iter2257')) {
    findings.push({
      level: 'error',
      source: 'IS.src-create-btn-title',
      message: '[IS] iter2257 src-create-btn title 3-path sync が消えている',
    })
  }

  // ========= IR. budget edit form button family title sweep (iter2255) =========
  const bpIR = read(here, `${root}/src/components/workspace/budget-panel.tsx`)
  if (!bpIR.includes('iter2255')) {
    findings.push({
      level: 'error',
      source: 'IR.budget-cancel-save-title',
      message: '[IR] iter2255 budget edit form button family title が消えている',
    })
  }

  // ========= IQ. proposals-accept-all / reject-all title sweep (iter2253) =========
  const dpIQ = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (!dpIQ.includes('iter2253')) {
    findings.push({
      level: 'error',
      source: 'IQ.proposals-accept-reject-title',
      message: '[IQ] iter2253 proposals-accept-all / reject-all title 2-path sync が消えている',
    })
  }

  // ========= IP. picker family PopoverContent title sweep (iter2251) =========
  const tpIP = read(here, `${root}/src/components/workspace/tag-picker.tsx`)
  if (!tpIP.includes('iter2251') || !tpIP.includes('title="タグ — 選択 / 新規作成"')) {
    findings.push({
      level: 'error',
      source: 'IP.tag-picker-popover-title',
      message: '[IP] iter2251 tag-picker PopoverContent title sync が消えている',
    })
  }
  const apIP = read(here, `${root}/src/components/workspace/assignee-picker.tsx`)
  if (
    !apIP.includes('iter2251') ||
    !apIP.includes('title="アサイン — メンバー / AI Agent を選択"')
  ) {
    findings.push({
      level: 'error',
      source: 'IP.assignee-picker-popover-title',
      message: '[IP] iter2251 assignee-picker PopoverContent title sync が消えている',
    })
  }

  // ========= IO. today-view header chips title sweep (iter2249) =========
  const tvIO = read(here, `${root}/src/components/workspace/today-view.tsx`)
  if (!tvIO.includes('iter2249')) {
    findings.push({
      level: 'error',
      source: 'IO.today-header-chips-title',
      message: '[IO] iter2249 today-view header chips title sync が消えている',
    })
  }

  // ========= IN. Gantt chart root container title sweep (iter2247) =========
  const gvIN = read(here, `${root}/src/components/workspace/gantt-view.tsx`)
  if (
    !gvIN.includes('iter2247') ||
    !gvIN.includes(
      'title={`Gantt チャート — Item ${withDates.length} 件 × 期間 ${totalSpanDays} 日`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'IN.gantt-root-title',
      message: '[IN] iter2247 Gantt chart root container title sync が消えている',
    })
  }

  // ========= IM. weekly-time-trend-chip title sweep (iter2245) =========
  const tibIM = read(here, `${root}/src/components/time-entry/top-items-by-time-chip.tsx`)
  if (!tibIM.includes('iter2245') || !tibIM.includes('title={summary.trendLine}')) {
    findings.push({
      level: 'error',
      source: 'IM.weekly-trend-chip-title',
      message: '[IM] iter2245 weekly-time-trend-chip title sync が消えている',
    })
  }

  // ========= IL. subtasks-panel 2 ol title sweep (iter2243) =========
  const spIL = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  if (!spIL.includes('iter2243')) {
    findings.push({
      level: 'error',
      source: 'IL.subtasks-ol-title',
      message: '[IL] iter2243 subtasks-panel 2 ol title sync が消えている',
    })
  }

  // ========= IK. goals-panel KR add form title sweep (iter2241) =========
  const gpIK = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (
    !gpIK.includes('iter2241') ||
    !gpIK.includes('title={`Goal「${goalTitle}」の Key Result 追加フォーム`}')
  ) {
    findings.push({
      level: 'error',
      source: 'IK.goals-kr-add-form-title',
      message: '[IK] iter2241 goals-panel KR add form title sync が消えている',
    })
  }

  // ========= IJ. template-card title disclosure button title sweep (iter2239) =========
  const tpIJ = read(here, `${root}/src/components/template/templates-panel.tsx`)
  if (!tpIJ.includes('iter2239') || !tpIJ.includes('title={`${t.name} — Template「${t.name}」')) {
    findings.push({
      level: 'error',
      source: 'IJ.template-card-disclosure-title',
      message: '[IJ] iter2239 template-card title disclosure button title sync が消えている',
    })
  }

  // ========= IH. item-summary-panel 3 chip title sweep (iter2237) =========
  const ispIH = read(here, `${root}/src/components/workspace/item-summary-panel.tsx`)
  if (!ispIH.includes('iter2237') || !ispIH.includes('chip 3 element 同時 title sync')) {
    findings.push({
      level: 'error',
      source: 'IH.item-summary-chips-title',
      message: '[IH] iter2237 item-summary-panel 3 chip title sync が消えている',
    })
  }

  // ========= IG. team-context save button title sweep (iter2235) =========
  const tceIG = read(here, `${root}/src/components/workspace/team-context-editor.tsx`)
  if (
    !tceIG.includes('iter2235') ||
    !tceIG.includes('保存 — チームコンテキストに変更がないため保存不要') ||
    !tceIG.includes('保存中… — チームコンテキストを保存中…')
  ) {
    findings.push({
      level: 'error',
      source: 'IG.team-context-save-title',
      message: '[IG] iter2235 team-context save button title 3-path sync が消えている',
    })
  }

  // ========= IF. FocusQuickAddButton title sweep (iter2233) =========
  const fqIF = read(here, `${root}/src/components/workspace/focus-quick-add-button.tsx`)
  if (
    !fqIF.includes('iter2233') ||
    !fqIF.includes(
      'title="クイック追加にフォーカス (キー: q) — quick-add input にフォーカスして即タスク入力"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'IF.focus-quick-add-title',
      message: '[IF] iter2233 FocusQuickAddButton title 同期 が消えている',
    })
  }

  // ========= IE. item-research-button title sweep (iter2231) =========
  const rbIE = read(here, `${root}/src/components/workspace/item-research-button.tsx`)
  if (
    !rbIE.includes('iter2231') ||
    !rbIE.includes('「${item.title}」は完了済のため AI 調査不可') ||
    !rbIE.includes('「${item.title}」を AI 調査中…') ||
    !rbIE.includes('「${item.title}」を AI 調査して Doc を作成')
  ) {
    findings.push({
      level: 'error',
      source: 'IE.item-research-btn-title',
      message: '[IE] iter2231 item-research-button title 3-path sync が消えている',
    })
  }

  // ========= ID. workspace-header ヘッダー操作 group title sweep (iter2229) =========
  const whID = read(here, `${root}/src/components/workspace/workspace-header.tsx`)
  if (
    !whID.includes('iter2229') ||
    !whID.includes('title={`${title} — ヘッダー操作 (ページ固有アクション / ユーティリティ)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'ID.workspace-header-ops-group-title',
      message: '[ID] iter2229 workspace-header ヘッダー操作 group title 同期 が消えている',
    })
  }

  // ========= IC. workspace-header title sweep (iter2227) =========
  const whIC = read(here, `${root}/src/components/workspace/workspace-header.tsx`)
  if (!whIC.includes('iter2227') || !whIC.includes('title={`${title} — Workspace`}')) {
    findings.push({
      level: 'error',
      source: 'IC.workspace-header-title',
      message: '[IC] iter2227 workspace-header title 同期 が消えている',
    })
  }

  // ========= IB. op-board ItemRow title sweep (iter2225) =========
  const opIB = read(here, `${root}/src/components/workspace/operation-board-widget.tsx`)
  if (!opIB.includes('iter2225') || !opIB.includes('title={ariaLabel}')) {
    findings.push({
      level: 'error',
      source: 'IB.op-board-itemrow-title',
      message: '[IB] iter2225 op-board ItemRow title 同期 が消えている',
    })
  }

  // ========= IA. proposal title button title sweep (iter2223) =========
  const dpIA = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (
    !dpIA.includes('iter2223') ||
    !dpIA.includes("title={`${proposal.title} — 提案を編集${proposal.isMust ? ' (MUST)' : ''}`}")
  ) {
    findings.push({
      level: 'error',
      source: 'IA.proposal-title-btn-title',
      message: '[IA] iter2223 proposal title button title 同期 が消えている',
    })
  }

  // ========= HZ. interrupt note input title sweep (iter2221) =========
  const spHZ = read(here, `${root}/src/components/schedule/schedule-item-picker.tsx`)
  if (
    !spHZ.includes('iter2221') ||
    !spHZ.includes("'割込み / 休憩のメモ (任意、空欄で「割込み」 fallback)'")
  ) {
    findings.push({
      level: 'error',
      source: 'HZ.interrupt-note-input-title',
      message: '[HZ] iter2221 interrupt note input title 同期 が消えている',
    })
  }

  // ========= HY. mock-timesheet nav title sweep (iter2219) =========
  const mtHY = read(here, `${root}/src/components/mock-timesheet/mock-top-nav.tsx`)
  if (
    !mtHY.includes('iter2219') ||
    !mtHY.includes('title="mock-timesheet — 新規入力 / 入力一覧 / ログアウト"')
  ) {
    findings.push({
      level: 'error',
      source: 'HY.mock-top-nav-title',
      message: '[HY] iter2219 mock-timesheet nav title 同期 が消えている',
    })
  }

  // ========= HX. create-workspace-form title sweep (iter2217) =========
  const cwfHX = read(here, `${root}/src/components/workspace/create-workspace-form.tsx`)
  if (!cwfHX.includes('iter2217') || !cwfHX.includes('title="Workspace 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'HX.create-workspace-form-title',
      message: '[HX] iter2217 create-workspace-form title 同期 が消えている',
    })
  }

  // ========= HW. workspace-mode radiogroup title sweep (iter2215) =========
  const wmHW = read(here, `${root}/src/components/workspace/workspace-mode-selector.tsx`)
  if (
    !wmHW.includes('iter2215') ||
    !wmHW.includes(
      'title={`workspace の default 作業モード — 現在 ${MODE_OPTIONS.find((o) => o.value === current)?.label ?? current}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'HW.workspace-mode-radiogroup-title',
      message: '[HW] iter2215 workspace-mode radiogroup title 同期 が消えている',
    })
  }

  // ========= HV. item-decompose-btn title 3-path sweep (iter2213) =========
  const idbHV = read(here, `${root}/src/components/workspace/item-decompose-button.tsx`)
  if (
    !idbHV.includes('iter2213') ||
    !idbHV.includes('AI 分解 — 「${item.title}」は完了済のため AI 分解不可')
  ) {
    findings.push({
      level: 'error',
      source: 'HV.item-decompose-btn-title',
      message: '[HV] iter2213 item-decompose-btn title 3-path 同期 が消えている',
    })
  }

  // ========= HU. engineer-trigger-btn title sweep (iter2211) =========
  const etHU = read(here, `${root}/src/components/workspace/engineer-trigger-button.tsx`)
  if (
    !etHU.includes('iter2211') ||
    !etHU.includes('起動中… — Engineer Agent に「${item.title}」を投入中')
  ) {
    findings.push({
      level: 'error',
      source: 'HU.engineer-trigger-btn-title',
      message: '[HU] iter2211 engineer-trigger-btn title 同期 が消えている',
    })
  }

  // ========= HT. engineer-auto-pr checkbox title sweep (iter2209) =========
  const etHT = read(here, `${root}/src/components/workspace/engineer-trigger-button.tsx`)
  if (
    !etHT.includes('iter2209') ||
    !etHT.includes("'PR 自動起票が ON: Engineer 起動時に Draft PR も作成される — クリックで OFF'")
  ) {
    findings.push({
      level: 'error',
      source: 'HT.engineer-auto-pr-title',
      message: '[HT] iter2209 engineer-auto-pr checkbox title 同期 が消えている',
    })
  }

  // ========= HS. engineer-trigger group title sweep (iter2207) =========
  const etHS = read(here, `${root}/src/components/workspace/engineer-trigger-button.tsx`)
  if (
    !etHS.includes('iter2207') ||
    !etHS.includes(
      'title={`「${item.title}」 — Engineer Agent に投入 (PR 自動起票 toggle / 実装起動)`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'HS.engineer-trigger-group-title',
      message: '[HS] iter2207 engineer-trigger group title 同期 が消えている',
    })
  }

  // ========= HR. heartbeat-button title state-dependent 同期 sweep (iter2205) =========
  const hbHR = read(here, `${root}/src/components/workspace/heartbeat-button.tsx`)
  if (
    !hbHR.includes('iter2205') ||
    !hbHR.includes("'スキャン中… — Heartbeat MUST スキャン実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'HR.heartbeat-button-title',
      message: '[HR] iter2205 heartbeat-button title state-dependent 同期 が消えている',
    })
  }
  if (hbHR.includes('title="MUST item を 7d / 3d / 1d / overdue 段階でスキャンして通知を作成"')) {
    findings.push({
      level: 'error',
      source: 'HR.heartbeat-button-title',
      message: '[HR] iter2205 heartbeat-button 旧 静的 title が残っている',
    })
  }

  // ========= HQ. risk-reasons ul title sweep (iter2203) =========
  const srHQ = read(here, `${root}/src/components/sprint/sprint-risk-board-widget.tsx`)
  if (
    !srHQ.includes('iter2203') ||
    !srHQ.includes('title={`「${entry.item.title}」のリスク理由 ${entry.reasons.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HQ.risk-reasons-ul-title',
      message: '[HQ] iter2203 risk-reasons ul title 同期 が消えている',
    })
  }

  // ========= HP. keybinding-combo dt title sweep (iter2201) =========
  const khHP = read(here, `${root}/src/components/shared/keybindings-help-modal.tsx`)
  if (!khHP.includes('iter2201') || !khHP.includes('title={`${kb.combo} — ショートカット`}')) {
    findings.push({
      level: 'error',
      source: 'HP.keybinding-combo-title',
      message: '[HP] iter2201 keybinding-combo dt title 同期 が消えている',
    })
  }

  // ========= HO. FocusFormCta title sweep (iter2199) =========
  const fcHO = read(here, `${root}/src/components/shared/focus-form-cta.tsx`)
  if (
    !fcHO.includes('iter2199') ||
    !fcHO.includes(
      'title={`作成フォームへ — ${entityName} 作成フォームの『${fieldName}』入力欄にフォーカス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'HO.focus-form-cta-title',
      message: '[HO] iter2199 FocusFormCta title 同期 が消えている',
    })
  }

  // ========= HN. StatCard role=group title sweep (iter2197) =========
  const dvHN = read(here, `${root}/src/components/workspace/dashboard-view.tsx`)
  if (!dvHN.includes('iter2197') || !dvHN.includes('title={ariaLabel}')) {
    findings.push({
      level: 'error',
      source: 'HN.stat-card-title',
      message: '[HN] iter2197 StatCard title 同期 が消えている',
    })
  }

  // ========= HM. Goal 一覧 ul title sweep (iter2195) =========
  const gpHM = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (
    !gpHM.includes('iter2195') ||
    !gpHM.includes('title={`Goal 一覧 — ${list.data.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HM.goals-list-title',
      message: '[HM] iter2195 Goal 一覧 ul title 同期 が消えている',
    })
  }

  // ========= HL. Sprint 一覧 ul title sweep (iter2193) =========
  const spHL = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spHL.includes('iter2193') ||
    !spHL.includes('title={`Sprint 一覧 — ${list.data.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HL.sprints-list-title',
      message: '[HL] iter2193 Sprint 一覧 ul title 同期 が消えている',
    })
  }

  // ========= HK. API 連携 source 一覧 ul title sweep (iter2191) =========
  const ipHK = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (
    !ipHK.includes('iter2191') ||
    !ipHK.includes('title={`API 連携 source 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HK.sources-list-title',
      message: '[HK] iter2191 API 連携 source 一覧 ul title 同期 が消えている',
    })
  }

  // ========= HJ. workflows ul list title sweep (iter2189) =========
  const wfpHJ = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !wfpHJ.includes('iter2189') ||
    !wfpHJ.includes('title={`Workflow 一覧 — ${list.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HJ.workflows-list-title',
      message: '[HJ] iter2189 workflows ul list title 同期 が消えている',
    })
  }

  // ========= HI. active-timer ops group title sweep (iter2187) =========
  const atpHI = read(here, `${root}/src/components/workspace/active-timer-panel.tsx`)
  if (
    !atpHI.includes('iter2187') ||
    !atpHI.includes(
      "title={`タスクタイマーの操作 — 現在 ${running ? '計測中' : '一時停止中'}、一時停止 / 再開 / Picture-in-Picture / 停止`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'HI.active-timer-ops-group-title',
      message: '[HI] iter2187 active-timer ops group title 同期 が消えている',
    })
  }

  // ========= HH. BulkHeaderCheckbox title sweep (iter2185) =========
  const baHH = read(here, `${root}/src/components/workspace/bulk-action-bar.tsx`)
  if (
    !baHH.includes('iter2185') ||
    !baHH.includes('`全解除 — 現ページ ${rowIds.length} 行をすべて選択中、クリックで全解除`')
  ) {
    findings.push({
      level: 'error',
      source: 'HH.bulk-header-checkbox-title',
      message: '[HH] iter2185 BulkHeaderCheckbox title 同期 が消えている',
    })
  }

  // ========= HG. BulkCheckbox title sweep (iter2183) =========
  const baHG = read(here, `${root}/src/components/workspace/bulk-action-bar.tsx`)
  if (!baHG.includes('iter2183') || !baHG.includes('title={label}')) {
    findings.push({
      level: 'error',
      source: 'HG.bulk-checkbox-title',
      message: '[HG] iter2183 BulkCheckbox title 同期 が消えている',
    })
  }

  // ========= HF. taskchute ol timeline title sweep (iter2181) =========
  const tcHF = read(here, `${root}/src/components/workspace/taskchute-view.tsx`)
  if (
    !tcHF.includes('iter2181') ||
    !tcHF.includes('title={`今日の task を時刻昇順で並べた 1 列 timeline — ${ordered.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HF.taskchute-timeline-title',
      message: '[HF] iter2181 taskchute ol timeline title 同期 が消えている',
    })
  }

  // ========= HE. taskchute-ticker-summary title sweep (iter2179) =========
  const tcHE = read(here, `${root}/src/components/workspace/taskchute-view.tsx`)
  if (!tcHE.includes('iter2179') || !tcHE.includes('title={`合計 ${ticker.totalEstimateMin} 分')) {
    findings.push({
      level: 'error',
      source: 'HE.taskchute-ticker-title',
      message: '[HE] iter2179 taskchute-ticker-summary title 同期 が消えている',
    })
  }

  // ========= HD. dep-readiness-chip title sweep (iter2177) =========
  const depHD = read(here, `${root}/src/components/workspace/item-dependencies-panel.tsx`)
  if (
    !depHD.includes('iter2177') ||
    !depHD.includes('title={`${readinessSummary} — 依存サマリ (${readinessVisual.toneLabel})`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HD.dep-readiness-chip-title',
      message: '[HD] iter2177 dep-readiness-chip title 同期 が消えている',
    })
  }

  // ========= HC. time-entries sync-error div title sweep (iter2175) =========
  const ttHC = read(here, `${root}/src/components/time-entry/time-entries-table.tsx`)
  if (!ttHC.includes('iter2175') || !ttHC.includes('title={`${e.syncError} — 同期エラー`}')) {
    findings.push({
      level: 'error',
      source: 'HC.sync-error-title',
      message: '[HC] iter2175 sync-error div title 同期 が消えている',
    })
  }

  // ========= HB. pdca daily-bars list title sweep (iter2173) =========
  const ppHB = read(here, `${root}/src/components/workspace/pdca-panel.tsx`)
  if (
    !ppHB.includes('iter2173') ||
    !ppHB.includes('title={`日次完了 throughput — ${data.length} 日分`}')
  ) {
    findings.push({
      level: 'error',
      source: 'HB.pdca-daily-bars-title',
      message: '[HB] iter2173 pdca daily-bars list title 付与 が消えている',
    })
  }

  // ========= HA. PDCA 4 段階の集計 group title sweep (iter2171) =========
  const ppHA = read(here, `${root}/src/components/workspace/pdca-panel.tsx`)
  if (
    !ppHA.includes('iter2171') ||
    !ppHA.includes(
      'title={`PDCA 4 段階の集計 — Plan ${counts.plan} / Do ${counts.do} / Check ${counts.check} / Act ${counts.act} 件`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'HA.pdca-counts-group-title',
      message: '[HA] iter2171 PDCA 4 段階の集計 group title 付与 が消えている',
    })
  }

  // ========= GZ. weekly-insight anomalies ul title sweep (iter2169) =========
  const wiGZ = read(here, `${root}/src/components/workspace/weekly-insight-widget.tsx`)
  if (
    !wiGZ.includes('iter2169') ||
    !wiGZ.includes(
      'title={`今週の特筆事項 ${insight.anomalies.length} 件 — 集中日 / 過小日 / 期限超過 spike`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GZ.weekly-anomalies-title',
      message: '[GZ] iter2169 weekly-insight anomalies ul title 付与 が消えている',
    })
  }

  // ========= GY. コメント一覧 ul title sweep (iter2167) =========
  const ctGY = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (
    !ctGY.includes('iter2167') ||
    !ctGY.includes('title={`コメント一覧 — ${comments!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GY.comment-list-title',
      message: '[GY] iter2167 コメント一覧 ul title 付与 が消えている',
    })
  }

  // ========= GX. PDCA Cycle progressbar title sweep (iter2165) =========
  const ccGX = read(here, `${root}/src/components/pdca/cycle-check-stats-card.tsx`)
  if (
    !ccGX.includes('iter2165') ||
    !ccGX.includes('title={`PDCA Cycle 完了率 ${stats.completionRate}% — ${severityLabelJa(sev)}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GX.pdca-progressbar-title',
      message: '[GX] iter2165 PDCA Cycle progressbar title 付与 が消えている',
    })
  }

  // ========= GW. retro-comparison group title sweep (iter2163) =========
  const srGW = read(here, `${root}/src/components/sprint/sprint-retro-widget.tsx`)
  if (
    !srGW.includes('iter2163') ||
    !srGW.includes('title={`前 Sprint 比 ${trendLabel(cmp.trend)} — 完了率')
  ) {
    findings.push({
      level: 'error',
      source: 'GW.retro-comparison-title',
      message: '[GW] iter2163 retro-comparison group title 付与 が消えている',
    })
  }

  // ========= GV. schedule-picker title sweep (iter2161) =========
  const spGV = read(here, `${root}/src/components/schedule/schedule-item-picker.tsx`)
  const iter2161CountGV = (spGV.match(/iter2161/g) ?? []).length
  if (iter2161CountGV < 2) {
    findings.push({
      level: 'error',
      source: 'GV.schedule-picker-title',
      message: `[GV] iter2161 marker 不足 (count=${iter2161CountGV}、ul + button 2 個必要)`,
    })
  }
  if (
    !spGV.includes('title={`検索結果 — ${filtered.length} 件`}') ||
    !spGV.includes("title={`${it.title} — item を選択${it.isMust ? ' (MUST)' : ''}`}")
  ) {
    findings.push({
      level: 'error',
      source: 'GV.schedule-picker-title',
      message: '[GV] iter2161 schedule-picker title 同期 が消えている',
    })
  }

  // ========= GU. Template 子 Item 一覧 ul title sweep (iter2159) =========
  const tiGU = read(here, `${root}/src/components/template/template-items-editor.tsx`)
  if (
    !tiGU.includes('iter2159') ||
    !tiGU.includes('title={`Template 子 Item 一覧 — ${items.data!.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GU.template-items-list-title',
      message: '[GU] iter2159 Template 子 Item 一覧 ul title 付与 が消えている',
    })
  }

  // ========= GT. backlog-title button title sweep (iter2157) =========
  const bvGT = read(here, `${root}/src/components/workspace/backlog-view.tsx`)
  if (!bvGT.includes('iter2157') || !bvGT.includes('title={`${String(getValue())} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'GT.backlog-title-btn',
      message: '[GT] iter2157 backlog-title button title 付与 が消えている',
    })
  }

  // ========= GS. inbox-view item button title sweep (iter2155) =========
  const ivGS = read(here, `${root}/src/components/workspace/inbox-view.tsx`)
  if (
    !ivGS.includes('iter2155') ||
    !ivGS.includes('title={`${it.title} — 編集ダイアログで開く`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GS.inbox-item-title',
      message: '[GS] iter2155 inbox-view item button title 同期 が消えている',
    })
  }

  // ========= GR. today-view item button title sweep (iter2153) =========
  const tvGR = read(here, `${root}/src/components/workspace/today-view.tsx`)
  if (!tvGR.includes('iter2153') || !tvGR.includes('title={`${it.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'GR.today-item-title',
      message: '[GR] iter2153 today-view item button title 同期 が消えている',
    })
  }

  // ========= GQ. personal-period item button title sweep (iter2151) =========
  const pvGQ = read(here, `${root}/src/components/workspace/personal-period-view.tsx`)
  if (!pvGQ.includes('iter2151') || !pvGQ.includes('title={`${it.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'GQ.personal-period-item-title',
      message: '[GQ] iter2151 personal-period item button title 同期 が消えている',
    })
  }

  // ========= GP. op-board quick-wins + focus-blocks button title sweep (iter2149) =========
  const opGP = read(here, `${root}/src/components/workspace/operation-board-widget.tsx`)
  const iter2149CountGP = (opGP.match(/iter2149/g) ?? []).length
  if (iter2149CountGP < 2) {
    findings.push({
      level: 'error',
      source: 'GP.op-board-buttons-title',
      message: `[GP] iter2149 marker 不足 (count=${iter2149CountGP}、quick-wins + focus-blocks 2 個必要)`,
    })
  }
  if (
    !opGP.includes('title={`${it.title} を開く — 見積 ${it.estimateMin}分`}') ||
    !opGP.includes('title={`${it.title} を開く — 集中 ${it.estimateMin}分`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GP.op-board-buttons-title',
      message: '[GP] iter2149 op-board buttons title sync が消えている',
    })
  }

  // ========= GO. filter-count status title sweep (iter2147) =========
  const ibGO = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (!ibGO.includes('iter2147') || !ibGO.includes('title={label}')) {
    findings.push({
      level: 'error',
      source: 'GO.filter-count-title',
      message: '[GO] iter2147 filter-count status title 同期 が消えている',
    })
  }

  // ========= GN. dashboard MUST item button title sweep (iter2145) =========
  const dvGN = read(here, `${root}/src/components/workspace/dashboard-view.tsx`)
  if (!dvGN.includes('iter2145') || !dvGN.includes('title={`${item.title} — MUST item を編集`}')) {
    findings.push({
      level: 'error',
      source: 'GN.dashboard-must-edit-title',
      message: '[GN] iter2145 dashboard MUST item button title 同期 が消えている',
    })
  }

  // ========= GM. workflows trigger プリセット group title sweep (iter2143) =========
  const wfpGM = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !wfpGM.includes('iter2143') ||
    !wfpGM.includes(
      'title="trigger プリセット — 4 種 manual / cron / item-event / webhook、JSON に 1 click 投入"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GM.wf-trigger-presets-group-title',
      message: '[GM] iter2143 wf trigger プリセット group title 付与 が消えている',
    })
  }

  // ========= GL. workflows node 追加プリセット group title sweep (iter2141) =========
  const wfpGL = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !wfpGL.includes('iter2141') ||
    !wfpGL.includes(
      'title={`node 追加プリセット — ${NODE_PRESETS.length} 種、graph JSON に skeleton を 1 click 投入`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GL.wf-node-presets-group-title',
      message: '[GL] iter2141 wf node 追加プリセット group title 付与 が消えている',
    })
  }

  // ========= GK. subtask group title sweep (iter2139) =========
  const spGK = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  if (
    !spGK.includes('iter2139') ||
    !spGK.includes('title={`グループ「${item.title}」 — 子タスク ${grandchildren.length} 件`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GK.subtask-group-title',
      message: '[GK] iter2139 subtask group title 付与 が消えている',
    })
  }

  // ========= GJ. budget edit ops group title sweep (iter2137) =========
  const bpGJ = read(here, `${root}/src/components/workspace/budget-panel.tsx`)
  if (
    !bpGJ.includes('iter2137') ||
    !bpGJ.includes('title="AI 月次コスト上限編集の操作 — キャンセル / 保存"')
  ) {
    findings.push({
      level: 'error',
      source: 'GJ.budget-edit-ops-group-title',
      message: '[GJ] iter2137 budget edit ops group title 付与 が消えている',
    })
  }

  // ========= GI. proposal ops group title sweep (iter2135) =========
  const dpGI = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (
    !dpGI.includes('iter2135') ||
    !dpGI.includes('title={`提案「${proposal.title}」の操作 — 採用 / 却下`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GI.proposal-ops-group-title',
      message: '[GI] iter2135 proposal ops group title 付与 が消えている',
    })
  }

  // ========= GH. comment ops group title sweep (iter2133) =========
  const ctGH = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (
    !ctGH.includes('iter2133') ||
    !ctGH.includes(
      "title={`コメント「${comment.body.slice(0, 30)}${comment.body.length > 30 ? '…' : ''}」の操作 — 編集 / 削除、自分の投稿のみ`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GH.comment-ops-group-title',
      message: '[GH] iter2133 comment ops group title 付与 が消えている',
    })
  }

  // ========= GG. proposal edit form ops group title sweep (iter2131) =========
  const dpGG = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (
    !dpGG.includes('iter2131') ||
    !dpGG.includes('title={`提案「${proposal.title}」の編集 form 操作 — キャンセル / 保存`}')
  ) {
    findings.push({
      level: 'error',
      source: 'GG.proposal-edit-ops-group-title',
      message: '[GG] iter2131 proposal edit form ops group title 付与 が消えている',
    })
  }

  // ========= GF. Sprint デフォルト編集 ops group title 付与 sweep (iter2129) =========
  const spGF = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spGF.includes('iter2129') ||
    !spGF.includes('title="Sprint デフォルト編集の操作 — キャンセル / 保存"')
  ) {
    findings.push({
      level: 'error',
      source: 'GF.sprint-defaults-ops-group-title',
      message: '[GF] iter2129 Sprint デフォルト編集 ops group title 付与 が消えている',
    })
  }

  // ========= GE. Sprint 期間進捗 group title 付与 sweep (iter2127) =========
  const spGE = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spGE.includes('iter2127') ||
    !spGE.includes(
      'title={`Sprint「${sprint.name}」期間進捗 経過 ${elapsedDays} / ${totalDays} 日 (${elapsedPct}%)、残 ${remainingDays} 日`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GE.sprint-period-progress-title',
      message: '[GE] iter2127 Sprint 期間進捗 group title 付与 が消えている',
    })
  }

  // ========= GD. active-timer-pip title 4-path sweep (iter2125) =========
  const atpGD = read(here, `${root}/src/components/workspace/active-timer-panel.tsx`)
  if (!atpGD.includes('iter2125') || !atpGD.includes("'Picture-in-Picture — 開いています…'")) {
    findings.push({
      level: 'error',
      source: 'GD.active-timer-pip-title',
      message: '[GD] iter2125 active-timer-pip title 4-path 同期 が消えている',
    })
  }
  if (/'PiP を閉じる'/.test(atpGD)) {
    findings.push({
      level: 'error',
      source: 'GD.active-timer-pip-title',
      message: '[GD] iter2125 active-timer-pip 旧 3-path title が残っている',
    })
  }

  // ========= GC. budget-edit-btn title 付与 sweep (iter2123) =========
  const bpGC = read(here, `${root}/src/components/workspace/budget-panel.tsx`)
  if (
    !bpGC.includes('iter2123') ||
    !bpGC.includes('title="上限を変更 — AI 月次コスト上限と警告閾値の編集モードを開く"')
  ) {
    findings.push({
      level: 'error',
      source: 'GC.budget-edit-btn-title',
      message: '[GC] iter2123 budget-edit-btn title 付与 が消えている',
    })
  }

  // ========= GB. item-edit-set-baseline title 3-path sweep (iter2121) =========
  const iedGB = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (
    !iedGB.includes('iter2121') ||
    !iedGB.includes('記録中… — 「${item.title}」のベースラインを記録中')
  ) {
    findings.push({
      level: 'error',
      source: 'GB.item-edit-set-baseline-title',
      message: '[GB] iter2121 item-edit-set-baseline title 3-path 同期 が消えている',
    })
  }

  // ========= GA. item-edit-clear-baseline + save-as-template title sweep (iter2119) =========
  const iedGA = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  const iter2119CountGA = (iedGA.match(/iter2119/g) ?? []).length
  if (iter2119CountGA < 2) {
    findings.push({
      level: 'error',
      source: 'GA.item-edit-clear-baseline-template-title',
      message: `[GA] iter2119 marker 不足 (count=${iter2119CountGA}、clear-baseline + save-as-template 2 個必要)`,
    })
  }
  if (/^\s+title="baseline 列を NULL に戻す"$/m.test(iedGA)) {
    findings.push({
      level: 'error',
      source: 'GA.item-edit-clear-baseline-template-title',
      message: '[GA] iter2119 item-edit-clear-baseline 旧 静的 title が残っている',
    })
  }
  if (
    /^\s+title="この Item と全ての子孫 \(subtask\) を Template として保存 \(再利用可\)"$/m.test(
      iedGA,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'GA.item-edit-clear-baseline-template-title',
      message: '[GA] iter2119 item-edit-save-as-template 旧 静的 title が残っている',
    })
  }

  // ========= FZ. gantt-summary 3 chip title sweep (iter2117) =========
  const gvFZ = read(here, `${root}/src/components/workspace/gantt-view.tsx`)
  const iter2117CountFZ = (gvFZ.match(/iter2117/g) ?? []).length
  if (iter2117CountFZ < 3) {
    findings.push({
      level: 'error',
      source: 'FZ.gantt-summary-chips-title',
      message: `[FZ] iter2117 marker 不足 (count=${iter2117CountFZ}、critical/baseline/slip 3 個必要)`,
    })
  }
  if (/^\s+title="critical path 上の item/m.test(gvFZ)) {
    findings.push({
      level: 'error',
      source: 'FZ.gantt-summary-chips-title',
      message: '[FZ] iter2117 gantt-summary-critical 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="baseline = 計画策定時/m.test(gvFZ)) {
    findings.push({
      level: 'error',
      source: 'FZ.gantt-summary-chips-title',
      message: '[FZ] iter2117 gantt-summary-baseline 旧 静的 title が残っている',
    })
  }
  if (/title=\{`baseline より遅れている item の合計遅延日数`\}/.test(gvFZ)) {
    findings.push({
      level: 'error',
      source: 'FZ.gantt-summary-chips-title',
      message: '[FZ] iter2117 gantt-summary-slip 旧 静的 title が残っている',
    })
  }

  // ========= FY. kanban-edit title aria-sync (em-dash convention) sweep (iter2115) =========
  const kvFY = read(here, `${root}/src/components/workspace/kanban-view.tsx`)
  if (
    !kvFY.includes('iter2115') ||
    !kvFY.includes('title={`編集 — 「${item.title}」を編集 (✎ アイコン)`}')
  ) {
    findings.push({
      level: 'error',
      source: 'FY.kanban-edit-title',
      message: '[FY] iter2115 kanban-edit title em-dash convention 同期 が消えている',
    })
  }
  if (/title=\{`「\$\{item\.title\}」を編集`\}/.test(kvFY)) {
    findings.push({
      level: 'error',
      source: 'FY.kanban-edit-title',
      message: '[FY] iter2115 kanban-edit 旧 title が残っている',
    })
  }

  // ========= FX. subtask-outdent + indent title multi-path sweep (iter2113) =========
  const spFX = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  const iter2113CountFX = (spFX.match(/iter2113/g) ?? []).length
  if (iter2113CountFX < 2) {
    findings.push({
      level: 'error',
      source: 'FX.subtask-outdent-indent-title',
      message: `[FX] iter2113 marker 不足 (count=${iter2113CountFX}、outdent + indent 2 個必要)`,
    })
  }
  if (/^\s+title="アウトデント \(Alt\+←\)"$/m.test(spFX)) {
    findings.push({
      level: 'error',
      source: 'FX.subtask-outdent-indent-title',
      message: '[FX] iter2113 subtask-outdent 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="インデント \(Alt\+→\)"$/m.test(spFX)) {
    findings.push({
      level: 'error',
      source: 'FX.subtask-outdent-indent-title',
      message: '[FX] iter2113 subtask-indent 旧 静的 title が残っている',
    })
  }

  // ========= FW. dep-remove title 2-path state-dependent 同期 sweep (iter2111) =========
  const depFW = read(here, `${root}/src/components/workspace/item-dependencies-panel.tsx`)
  if (!depFW.includes('iter2111') || !depFW.includes('解除 — 依存「${ref.title}」を解除中…')) {
    findings.push({
      level: 'error',
      source: 'FW.dep-remove-title',
      message: '[FW] iter2111 dep-remove title 2-path state-dependent 同期 が消えている',
    })
  }
  if (/title=\{`依存「\$\{ref\.title\}」を解除`\}/.test(depFW)) {
    findings.push({
      level: 'error',
      source: 'FW.dep-remove-title',
      message: '[FW] iter2111 dep-remove 旧 静的 title が残っている',
    })
  }

  // ========= FV. proposal-accept + proposal-reject title sweep (iter2109) =========
  const dpFV = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  const iter2109CountFV = (dpFV.match(/iter2109/g) ?? []).length
  if (iter2109CountFV < 2) {
    findings.push({
      level: 'error',
      source: 'FV.proposal-accept-reject-title',
      message: `[FV] iter2109 marker 不足 (count=${iter2109CountFV}、accept + reject 2 個必要)`,
    })
  }
  if (/^\s+title="採用 → 子タスクとして追加"$/m.test(dpFV)) {
    findings.push({
      level: 'error',
      source: 'FV.proposal-accept-reject-title',
      message: '[FV] iter2109 proposal-accept 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="却下"$/m.test(dpFV)) {
    findings.push({
      level: 'error',
      source: 'FV.proposal-accept-reject-title',
      message: '[FV] iter2109 proposal-reject 旧 静的 title が残っている',
    })
  }

  // ========= FU. proposals-redecompose + redecompose-fresh title sweep (iter2107) =========
  const dpFU = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  const iter2107CountFU = (dpFU.match(/iter2107/g) ?? []).length
  if (iter2107CountFU < 2) {
    findings.push({
      level: 'error',
      source: 'FU.proposals-redecompose-title',
      message: `[FU] iter2107 marker 不足 (count=${iter2107CountFU}、redecompose + fresh 2 個必要)`,
    })
  }
  if (/^\s+title="既存の提案を残したまま追加で分解"$/m.test(dpFU)) {
    findings.push({
      level: 'error',
      source: 'FU.proposals-redecompose-title',
      message: '[FU] iter2107 proposals-redecompose 旧 静的 title が残っている',
    })
  }
  if (/^\s+title="既存提案を全て却下してから再分解"$/m.test(dpFU)) {
    findings.push({
      level: 'error',
      source: 'FU.proposals-redecompose-title',
      message: '[FU] iter2107 proposals-redecompose-fresh 旧 静的 title が残っている',
    })
  }

  // ========= FT. agent-cancel title 2-path state-dependent 同期 sweep (iter2105) =========
  const dpFT = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (!dpFT.includes('iter2105') || !dpFT.includes("'中止 — 実行中の Agent を中止中…'")) {
    findings.push({
      level: 'error',
      source: 'FT.agent-cancel-title',
      message: '[FT] iter2105 agent-cancel title 2-path state-dependent 同期 が消えている',
    })
  }
  if (/^\s+title="実行中の Agent を中止"$/m.test(dpFT)) {
    findings.push({
      level: 'error',
      source: 'FT.agent-cancel-title',
      message: '[FT] iter2105 agent-cancel 旧 静的 title が残っている',
    })
  }

  // ========= FS. src-pull title 3-path state-dependent 同期 sweep (iter2103) =========
  const ipFS = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (
    !ipFS.includes('iter2103') ||
    !ipFS.includes('Pull — Source「${src.name}」は無効化中のため Pull 不可')
  ) {
    findings.push({
      level: 'error',
      source: 'FS.src-pull-title',
      message: '[FS] iter2103 src-pull title 3-path state-dependent 同期 が消えている',
    })
  }
  if (/^\s+title="手動 pull \(sync 実行、30s timeout\)"$/m.test(ipFS)) {
    findings.push({
      level: 'error',
      source: 'FS.src-pull-title',
      message: '[FS] iter2103 src-pull 旧 静的 title が残っている',
    })
  }

  // ========= FR. wf-run-rerun title state-dependent 同期 sweep (iter2101) =========
  const wfpFR = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (!wfpFR.includes('iter2101') || !wfpFR.includes('再 — 実行 ${r.id.slice(0, 8)} を再実行中…')) {
    findings.push({
      level: 'error',
      source: 'FR.wf-run-rerun-title',
      message: '[FR] iter2101 wf-run-rerun title state-dependent 同期 が消えている',
    })
  }
  if (/title=\{`同じ input で再実行 \(\$\{formatRunTime\(r\)\}\)`\}/.test(wfpFR)) {
    findings.push({
      level: 'error',
      source: 'FR.wf-run-rerun-title',
      message: '[FR] iter2101 wf-run-rerun 旧 静的 title が残っている',
    })
  }

  // ========= FQ. kr-delete title state-dependent 同期 sweep (iter2099) =========
  const gpFQ = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpFQ.includes('iter2099') || !gpFQ.includes('削除中… — KR「${kr.title}」を削除中')) {
    findings.push({
      level: 'error',
      source: 'FQ.kr-delete-title',
      message: '[FQ] iter2099 kr-delete title state-dependent 同期 が消えている',
    })
  }
  if (/^\s+title="KR を削除 \(soft delete\)"$/m.test(gpFQ)) {
    findings.push({
      level: 'error',
      source: 'FQ.kr-delete-title',
      message: '[FQ] iter2099 kr-delete 旧 静的 title が残っている',
    })
  }

  // ========= FP. sprint-period-edit title aria-sync sweep (iter2097) =========
  const spFP = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spFP.includes('iter2097') ||
    !spFP.includes('title={`期間 — Sprint「${sprint.name}」の期間を編集`}')
  ) {
    findings.push({
      level: 'error',
      source: 'FP.sprint-period-edit-title',
      message: '[FP] iter2097 sprint-period-edit title aria-sync が消えている',
    })
  }
  // 旧 静的 title="期間を編集" が JSX attribute 行として残っていないこと
  if (/^\s+title="期間を編集"$/m.test(spFP)) {
    findings.push({
      level: 'error',
      source: 'FP.sprint-period-edit-title',
      message: '[FP] iter2097 sprint-period-edit 旧 静的 title が残っている',
    })
  }

  // ========= FO. sprint-premortem title state-dependent 同期 sweep (iter2095) =========
  const spFO = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spFO.includes('iter2095') ||
    !spFO.includes('Pre-mortem 生成中… — Sprint「${sprint.name}」の Pre-mortem を生成中')
  ) {
    findings.push({
      level: 'error',
      source: 'FO.sprint-premortem-title',
      message: '[FO] iter2095 sprint-premortem title state-dependent 同期 が消えている',
    })
  }

  // ========= FN. sprint-retro title state-dependent 同期 sweep (iter2093) =========
  const spFN = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (
    !spFN.includes('iter2093') ||
    !spFN.includes('振り返り生成中… — Sprint「${sprint.name}」の振り返り')
  ) {
    findings.push({
      level: 'error',
      source: 'FN.sprint-retro-title',
      message: '[FN] iter2093 sprint-retro title state-dependent 同期 が消えている',
    })
  }

  // ========= FM. wf-trigger title 4-path 同期 sweep (iter2091) =========
  const wfpFM = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !wfpFM.includes('iter2091') ||
    !wfpFM.includes('実行 — Workflow「${wf.name}」は無効化中のため実行不可')
  ) {
    findings.push({
      level: 'error',
      source: 'FM.wf-trigger-title',
      message: '[FM] iter2091 wf-trigger title 4-path 同期 が消えている',
    })
  }

  // ========= FL. goal-complete + goal-archive button title sweep (iter2089) =========
  const gpFL = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  const iter2089CountFL = (gpFL.match(/iter2089/g) ?? []).length
  if (iter2089CountFL < 2) {
    findings.push({
      level: 'error',
      source: 'FL.goal-status-btns',
      message: `[FL] iter2089 goal-complete + goal-archive title が消えている (count=${iter2089CountFL})`,
    })
  }

  // ========= FK. sprint-cancel button title sweep (iter2087) =========
  const spFK = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spFK.includes('iter2087')) {
    findings.push({
      level: 'error',
      source: 'FK.sprint-cancel',
      message: '[FK] iter2087 sprint-cancel button title が消えている',
    })
  }

  // ========= FJ. sprint-complete + sprint-replan button title sweep (iter2085) =========
  const spFJ = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  const iter2085CountFJ = (spFJ.match(/iter2085/g) ?? []).length
  if (iter2085CountFJ < 2) {
    findings.push({
      level: 'error',
      source: 'FJ.sprint-status-btns',
      message: `[FJ] iter2085 sprint-complete + sprint-replan title が消えている (count=${iter2085CountFJ})`,
    })
  }

  // ========= FI. sprint-activate button title sweep (iter2083) =========
  const spFI = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spFI.includes('iter2083')) {
    findings.push({
      level: 'error',
      source: 'FI.sprint-activate',
      message: '[FI] iter2083 sprint-activate button title が消えている',
    })
  }

  // ========= FH. time-entry sync button title sweep (iter2081) =========
  const ttFH = read(here, `${root}/src/components/time-entry/time-entries-table.tsx`)
  if (!ttFH.includes('iter2081')) {
    findings.push({
      level: 'error',
      source: 'FH.sync-btn',
      message: '[FH] iter2081 time-entry sync button title が消えている',
    })
  }

  // ========= FG. item-edit reload button title sweep (iter2079) =========
  const iedFG = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (
    !iedFG.includes('title="最新を読み込み — 自分の編集内容を破棄してサーバの最新値を読み込み直す"')
  ) {
    findings.push({
      level: 'error',
      source: 'FG.item-edit-reload',
      message: '[FG] iter2079 item-edit reload button title が消えている',
    })
  }

  // ========= FF. 5 sub-page main landmark title sweep (iter2077) =========
  const wfPageFF = read(here, `${root}/src/app/(workspace)/[workspaceId]/workflows/page.tsx`)
  const tePageFF = read(here, `${root}/src/app/(workspace)/[workspaceId]/time-entries/page.tsx`)
  const tmpPageFF = read(here, `${root}/src/app/(workspace)/[workspaceId]/templates/page.tsx`)
  const integPageFF = read(here, `${root}/src/app/(workspace)/[workspaceId]/integrations/page.tsx`)
  const arcPageFF = read(here, `${root}/src/app/(workspace)/[workspaceId]/archive/page.tsx`)
  if (
    !wfPageFF.includes('title="Workflows — 自動化ワークフロー (n8n 風)"') ||
    !tePageFF.includes('title="稼働入力 — やったこと + 時間を記録"') ||
    !tmpPageFF.includes('title="Templates — ワークパッケージ定義"') ||
    !integPageFF.includes('title="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込"') ||
    !arcPageFF.includes('title="アーカイブ済 Item 一覧"')
  ) {
    findings.push({
      level: 'error',
      source: 'FF.5-sub-page-mains',
      message: '[FF] iter2077 5 sub-page main landmark title が消えている',
    })
  }

  // ========= FE. 3 sub-page main landmark title sweep (iter2075) =========
  const sprintsFE = read(here, `${root}/src/app/(workspace)/[workspaceId]/sprints/page.tsx`)
  const goalsFE = read(here, `${root}/src/app/(workspace)/[workspaceId]/goals/page.tsx`)
  const pdcaFE = read(here, `${root}/src/app/(workspace)/[workspaceId]/pdca/page.tsx`)
  if (
    !sprintsFE.includes('title="Sprint — 計画 → 稼働 → 完了"') ||
    !goalsFE.includes('title="OKR / Goals — Objective + Key Results"') ||
    !pdcaFE.includes('title="PDCA — Plan / Do / Check / Act + Lead time"')
  ) {
    findings.push({
      level: 'error',
      source: 'FE.sub-page-mains',
      message: '[FE] iter2075 3 sub-page main landmark title が消えている',
    })
  }

  // ========= FD. home header landmark title sweep (iter2073) =========
  const homeFD = read(here, `${root}/src/app/page.tsx`)
  if (!homeFD.includes('title="最強TODO ホーム"')) {
    findings.push({
      level: 'error',
      source: 'FD.home-header',
      message: '[FD] iter2073 home header landmark title が消えている',
    })
  }

  // ========= FC. keybindings-help-modal DialogContent title sweep (iter2071) =========
  const kbFC = read(here, `${root}/src/components/shared/keybindings-help-modal.tsx`)
  if (!kbFC.includes('title="キーボードショートカット一覧"')) {
    findings.push({
      level: 'error',
      source: 'FC.keybindings-dialog',
      message: '[FC] iter2071 keybindings-help-modal DialogContent title が消えている',
    })
  }

  // ========= FB. workflows/integrations section title sweep (iter2069) =========
  const wfpFB = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  const integFB = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (
    !wfpFB.includes('title="Workflow 一覧と新規作成"') ||
    !integFB.includes('title="API 連携 source 一覧と新規作成"')
  ) {
    findings.push({
      level: 'error',
      source: 'FB.section-titles',
      message: '[FB] iter2069 workflows/integrations section title が消えている',
    })
  }

  // ========= FA. External Source 作成フォーム title sweep (iter2067) =========
  const integFA = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (!integFA.includes('title="External Source 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'FA.src-create-form',
      message: '[FA] iter2067 External Source 作成フォーム title が消えている',
    })
  }

  // ========= EZ. create-time-entry form title sweep (iter2065) =========
  const cteEZ = read(here, `${root}/src/components/time-entry/create-time-entry-form.tsx`)
  if (!cteEZ.includes('title="稼働記録 作成フォーム"')) {
    findings.push({
      level: 'error',
      source: 'EZ.cte-form',
      message: '[EZ] iter2065 create-time-entry form title が消えている',
    })
  }

  // ========= EY. mock-submit form title sweep (iter2063) =========
  const msfEY = read(here, `${root}/src/components/mock-timesheet/mock-submit-form.tsx`)
  if (!msfEY.includes('title="Mock Timesheet 工数送信フォーム"')) {
    findings.push({
      level: 'error',
      source: 'EY.mock-submit-form',
      message: '[EY] iter2063 mock-submit form title が消えている',
    })
  }

  // ========= EX. mock-login form title sweep (iter2061) =========
  const mlfEX = read(here, `${root}/src/components/mock-timesheet/mock-login-form.tsx`)
  if (!mlfEX.includes('title="Mock Timesheet ログインフォーム"')) {
    findings.push({
      level: 'error',
      source: 'EX.mock-login-form',
      message: '[EX] iter2061 mock-login form title が消えている',
    })
  }

  // ========= EW. 3 edit form title sweep (iter2059) =========
  const spEW = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  const bpEW = read(here, `${root}/src/components/workspace/budget-panel.tsx`)
  if (
    !spEW.includes('title="Sprint デフォルト設定 編集フォーム"') ||
    !spEW.includes('title={`Sprint「${sprint.name}」期間編集フォーム`}') ||
    !bpEW.includes('title="AI 月次コスト上限編集フォーム"')
  ) {
    findings.push({
      level: 'error',
      source: 'EW.edit-forms',
      message: '[EW] iter2059 3 edit form title が消えている',
    })
  }

  // ========= EV. dashboard 健全性 chip group title sweep (iter2057) =========
  const dvEV = read(here, `${root}/src/components/workspace/dashboard-view.tsx`)
  if (
    !dvEV.includes('title="Dashboard 健全性 chip 群 — urgency / velocity / momentum / due-coverage')
  ) {
    findings.push({
      level: 'error',
      source: 'EV.dashboard-chip-group',
      message: '[EV] iter2057 dashboard 健全性 chip group title が消えている',
    })
  }

  // ========= EU. sprint-retro-widget progressbar title sweep (iter2055) =========
  const retroEU = read(here, `${root}/src/components/sprint/sprint-retro-widget.tsx`)
  if (!retroEU.includes('iter2055')) {
    findings.push({
      level: 'error',
      source: 'EU.retro-progress',
      message: '[EU] iter2055 sprint-retro progressbar title が消えている',
    })
  }

  // ========= ET. team-capacity section title sweep (iter2053) =========
  const tcET = read(here, `${root}/src/components/workspace/team-capacity-panel.tsx`)
  if (!tcET.includes('title="チームメンバー余裕時間 一覧"')) {
    findings.push({
      level: 'error',
      source: 'ET.team-cap-section',
      message: '[ET] iter2053 team-capacity section title が消えている',
    })
  }

  // ========= ES. budget-panel progressbar title sweep (iter2051) =========
  const bpES = read(here, `${root}/src/components/workspace/budget-panel.tsx`)
  if (!bpES.includes('iter2051')) {
    findings.push({
      level: 'error',
      source: 'ES.budget-progress',
      message: '[ES] iter2051 budget-panel progressbar title が消えている',
    })
  }

  // ========= ER. weekly-insight-widget region title sweep (iter2049) =========
  const weeklyER = read(here, `${root}/src/components/workspace/weekly-insight-widget.tsx`)
  if (!weeklyER.includes('iter2049')) {
    findings.push({
      level: 'error',
      source: 'ER.weekly-region',
      message: '[ER] iter2049 weekly-insight-widget region title が消えている',
    })
  }

  // ========= EQ. taskchute-view region title sweep (iter2047) =========
  const tcEQ = read(here, `${root}/src/components/workspace/taskchute-view.tsx`)
  if (
    !tcEQ.includes('iter2047') ||
    !tcEQ.includes('title={`TaskChute mode — 今日の 1 列 timeline')
  ) {
    findings.push({
      level: 'error',
      source: 'EQ.taskchute-region',
      message: '[EQ] iter2047 taskchute-view region title が消えている',
    })
  }

  // ========= EP. 3 entity create form title sweep (iter2045) =========
  const spEP = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  const gpEP = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  const wfpEP = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (
    !spEP.includes('title="Sprint 作成フォーム"') ||
    !gpEP.includes('title="Goal 作成フォーム"') ||
    !wfpEP.includes('title="Workflow 作成フォーム"')
  ) {
    findings.push({
      level: 'error',
      source: 'EP.create-forms',
      message: '[EP] iter2045 3 entity 作成フォーム title が消えている',
    })
  }

  // ========= EO. integrations source operations group title sweep (iter2043) =========
  const integEO = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (!integEO.includes('iter2043')) {
    findings.push({
      level: 'error',
      source: 'EO.src-operations-group',
      message: '[EO] iter2043 integrations source operations group title が消えている',
    })
  }

  // ========= EN. sprint-period edit form group title sweep (iter2041) =========
  const spEN = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEN.includes('iter2041')) {
    findings.push({
      level: 'error',
      source: 'EN.sprint-period-edit-group',
      message: '[EN] iter2041 sprint-period edit form group title が消えている',
    })
  }

  // ========= EM. quick-add input title sweep (iter2039) =========
  const qaEM = read(here, `${root}/src/components/workspace/quick-add.tsx`)
  if (!qaEM.includes('iter2039')) {
    findings.push({
      level: 'error',
      source: 'EM.quick-add-input',
      message: '[EM] iter2039 quick-add input title が消えている',
    })
  }

  // ========= EL. comment-thread edit operations group title sweep (iter2037) =========
  const ctEL = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (!ctEL.includes('iter2037')) {
    findings.push({
      level: 'error',
      source: 'EL.comment-edit-group',
      message: '[EL] iter2037 comment-thread edit operations group title が消えている',
    })
  }

  // ========= EK. goals-panel operations group title sweep (iter2035) =========
  const gpEK = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpEK.includes('iter2035')) {
    findings.push({
      level: 'error',
      source: 'EK.goal-operations-group',
      message: '[EK] iter2035 goals-panel operations group title が消えている',
    })
  }

  // ========= EJ. sprints-panel operations group title sweep (iter2033) =========
  const spEJ = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEJ.includes('iter2033')) {
    findings.push({
      level: 'error',
      source: 'EJ.sprint-operations-group',
      message: '[EJ] iter2033 sprints-panel operations group title が消えている',
    })
  }

  // ========= EI. workflows-panel operations group title sweep (iter2031) =========
  const wfpEI = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (!wfpEI.includes('iter2031')) {
    findings.push({
      level: 'error',
      source: 'EI.wf-operations-group',
      message: '[EI] iter2031 workflows-panel operations group title が消えている',
    })
  }

  // ========= EH. template + 追加 button title sweep (iter2029) =========
  const tmplEH = read(here, `${root}/src/components/template/template-items-editor.tsx`)
  if (!tmplEH.includes('iter2029')) {
    findings.push({
      level: 'error',
      source: 'EH.template-add-btn',
      message: '[EH] iter2029 template + 追加 button title が消えている',
    })
  }

  // ========= EG. sprint-create endDate input title sweep (iter2027) =========
  const spEG = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEG.includes('iter2027')) {
    findings.push({
      level: 'error',
      source: 'EG.sprint-create-end',
      message: '[EG] iter2027 sprint-create endDate title が消えている',
    })
  }

  // ========= EF. sprint-create startDate input title sweep (iter2025) =========
  const spEF = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEF.includes('iter2025')) {
    findings.push({
      level: 'error',
      source: 'EF.sprint-create-start',
      message: '[EF] iter2025 sprint-create startDate title が消えている',
    })
  }

  // ========= EE. goals-panel goal-end date input title sweep (iter2023) =========
  const gpEE = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpEE.includes('iter2023')) {
    findings.push({
      level: 'error',
      source: 'EE.goal-end',
      message: '[EE] iter2023 goal-end date input title が消えている',
    })
  }

  // ========= ED. goals-panel goal-start date input title sweep (iter2021) =========
  const gpED = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpED.includes('iter2021')) {
    findings.push({
      level: 'error',
      source: 'ED.goal-start',
      message: '[ED] iter2021 goal-start date input title が消えている',
    })
  }

  // ========= EC. sprint-edit-end date input title sweep (iter2019) =========
  const spEC = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEC.includes('iter2019')) {
    findings.push({
      level: 'error',
      source: 'EC.sprint-edit-end',
      message: '[EC] iter2019 sprint-edit-end date input title が消えている',
    })
  }

  // ========= EB. sprint-edit-start date input title sweep (iter2017) =========
  const spEB = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spEB.includes('iter2017')) {
    findings.push({
      level: 'error',
      source: 'EB.sprint-edit-start',
      message: '[EB] iter2017 sprint-edit-start date input title が消えている',
    })
  }

  // ========= EA. item-edit-dialog tab-comments + tab-activity title sweep (iter2015) =========
  const iedEA = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (
    !iedEA.includes('title="コメントタブ — 議論履歴 + @メンション + AI Plan 投下"') ||
    !iedEA.includes('title="アクティビティタブ — 編集履歴 (audit_log) を時系列表示"')
  ) {
    findings.push({
      level: 'error',
      source: 'EA.tabs-comments-activity',
      message: '[EA] iter2015 item-edit-dialog tab-comments/activity title が消えている',
    })
  }

  // ========= DZ. item-edit-dialog tab-dependencies title sweep (iter2013) =========
  const iedDZ = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!iedDZ.includes('iter2013')) {
    findings.push({
      level: 'error',
      source: 'DZ.tab-deps',
      message: '[DZ] iter2013 item-edit-dialog tab-dependencies title が消えている',
    })
  }

  // ========= DY. item-edit-dialog tab-subtasks title sweep (iter2011) =========
  const iedDY = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!iedDY.includes('iter2011')) {
    findings.push({
      level: 'error',
      source: 'DY.tab-subtasks',
      message: '[DY] iter2011 item-edit-dialog tab-subtasks title が消えている',
    })
  }

  // ========= DX. item-edit-dialog tab-summary title sweep (iter2009) =========
  const iedDX = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (!iedDX.includes('title="サマリタブ — この案件の進捗 / 依存 / 最終更新を一目で確認"')) {
    findings.push({
      level: 'error',
      source: 'DX.tab-summary',
      message: '[DX] iter2009 item-edit-dialog tab-summary title が消えている',
    })
  }

  // ========= DW. item-edit-dialog tab-base title sweep (iter2007) =========
  const iedDW = read(here, `${root}/src/components/workspace/item-edit-dialog.tsx`)
  if (
    !iedDW.includes('title="基本タブ — タイトル / 状態 / 期限 / MUST / 担当 / Tag / DoD を編集"')
  ) {
    findings.push({
      level: 'error',
      source: 'DW.tab-base',
      message: '[DW] iter2007 item-edit-dialog tab-base title が消えている',
    })
  }

  // ========= DV. pdca 集計期間 group title sweep (iter2005) =========
  const pdcaDV = read(here, `${root}/src/components/workspace/pdca-panel.tsx`)
  if (!pdcaDV.includes('title={`集計期間 — 現在 ${days} 日、30 / 90 から選択`}')) {
    findings.push({
      level: 'error',
      source: 'DV.pdca-period-group',
      message: '[DV] iter2005 pdca 集計期間 group title が消えている',
    })
  }

  // ========= DU. period-goal save button title sweep (iter2003) =========
  const periodDU = read(here, `${root}/src/components/workspace/personal-period-view.tsx`)
  if (!periodDU.includes('iter2003')) {
    findings.push({
      level: 'error',
      source: 'DU.period-goal-save',
      message: '[DU] iter2003 period-goal save button title が消えている',
    })
  }

  // ========= DT. team-capacity summary toggle title sweep (iter2001) =========
  const tcDT = read(here, `${root}/src/components/workspace/team-capacity-panel.tsx`)
  if (!tcDT.includes('iter2001')) {
    findings.push({
      level: 'error',
      source: 'DT.team-cap-summary',
      message: '[DT] iter2001 team-capacity summary toggle title が消えている',
    })
  }

  // ========= DS. bulk-action-bar region title sweep (iter1999) =========
  const bbDS = read(here, `${root}/src/components/workspace/bulk-action-bar.tsx`)
  if (!bbDS.includes('title={`一括操作 — ${count} 件選択中`}')) {
    findings.push({
      level: 'error',
      source: 'DS.bulk-action-bar',
      message: '[DS] iter1999 bulk-action-bar region title が消えている',
    })
  }

  // ========= DR. decompose-proposals bulk group title sweep (iter1997) =========
  const decDR = read(here, `${root}/src/components/workspace/decompose-proposals-panel.tsx`)
  if (
    !decDR.includes(
      'title={`AI 分解提案の bulk 操作 — 全て採用 / 全て却下 / 再分解、保留中 ${list.length} 件`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'DR.decompose-bulk',
      message: '[DR] iter1997 decompose-proposals bulk group title が消えている',
    })
  }

  // ========= DQ. archived-items-panel item link title sweep (iter1995) =========
  const arcDQ = read(here, `${root}/src/components/workspace/archived-items-panel.tsx`)
  if (!arcDQ.includes('iter1995')) {
    findings.push({
      level: 'error',
      source: 'DQ.archive-link',
      message: '[DQ] iter1995 archived-items-panel item link title が消えている',
    })
  }

  // ========= DP. items-board filter group title sweep (iter1993) =========
  const boardDP = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (!boardDP.includes('iter1993')) {
    findings.push({
      level: 'error',
      source: 'DP.filter-group',
      message: '[DP] iter1993 items-board filter group title が消えている',
    })
  }

  // ========= DO. items-board view-switcher group title sweep (iter1991) =========
  const boardDO = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (!boardDO.includes('title={`表示切替 — 現在 ${VIEW_LABEL_JA[view] ?? view}`}')) {
    findings.push({
      level: 'error',
      source: 'DO.view-switcher-group',
      message: '[DO] iter1991 items-board view-switcher group title が消えている',
    })
  }

  // ========= DN. template-items dueOffset input title sweep (iter1989) =========
  const tmplDN = read(here, `${root}/src/components/template/template-items-editor.tsx`)
  if (!tmplDN.includes('iter1989')) {
    findings.push({
      level: 'error',
      source: 'DN.template-due-input',
      message: '[DN] iter1989 template-items dueOffset input title が消えている',
    })
  }

  // ========= DM. template-items 子 Item タイトル input title sweep (iter1987) =========
  const tmplDM = read(here, `${root}/src/components/template/template-items-editor.tsx`)
  if (!tmplDM.includes('iter1987')) {
    findings.push({
      level: 'error',
      source: 'DM.template-title-input',
      message: '[DM] iter1987 template-items 子 Item タイトル input title が消えている',
    })
  }

  // ========= DL. goals-panel goal-desc textarea title sweep (iter1985) =========
  const gpDL = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpDL.includes('iter1985')) {
    findings.push({
      level: 'error',
      source: 'DL.goal-desc',
      message: '[DL] iter1985 goals-panel goal-desc textarea title が消えている',
    })
  }

  // ========= DK. goals-panel goal-title input title sweep (iter1983) =========
  const gpDK = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpDK.includes('iter1983')) {
    findings.push({
      level: 'error',
      source: 'DK.goal-title',
      message: '[DK] iter1983 goals-panel goal-title input title が消えている',
    })
  }

  // ========= DJ. sprints-panel sprint-goal textarea title sweep (iter1981) =========
  const spDJ = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spDJ.includes('iter1981')) {
    findings.push({
      level: 'error',
      source: 'DJ.sprint-goal',
      message: '[DJ] iter1981 sprints-panel sprint-goal textarea title が消えている',
    })
  }

  // ========= DI. sprints-panel sprint-name input title sweep (iter1979) =========
  const spDI = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spDI.includes('iter1979')) {
    findings.push({
      level: 'error',
      source: 'DI.sprint-name',
      message: '[DI] iter1979 sprints-panel sprint-name input title が消えている',
    })
  }

  // ========= DH. workflows-panel wf-desc textarea title sweep (iter1977) =========
  const wfpDH = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (!wfpDH.includes('iter1977')) {
    findings.push({
      level: 'error',
      source: 'DH.wf-desc',
      message: '[DH] iter1977 workflows-panel wf-desc textarea title が消えている',
    })
  }

  // ========= DG. workflows-panel wf-name input title sweep (iter1975) =========
  const wfpDG = read(here, `${root}/src/components/workflow/workflows-panel.tsx`)
  if (!wfpDG.includes('iter1975')) {
    findings.push({
      level: 'error',
      source: 'DG.wf-name',
      message: '[DG] iter1975 workflows-panel wf-name input title が消えている',
    })
  }

  // ========= DF. comment-thread edit textarea title sweep (iter1973) =========
  const ctDF = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (!ctDF.includes('iter1973')) {
    findings.push({
      level: 'error',
      source: 'DF.comment-edit',
      message: '[DF] iter1973 comment-thread edit textarea title が消えている',
    })
  }

  // ========= DE. theme-toggle title em-dash 同期 sweep (iter1971) =========
  const ttDE = read(here, `${root}/src/components/shared/theme-toggle.tsx`)
  if (!ttDE.includes("'ライトテーマ — クリックで切替' : 'ダークテーマ — クリックで切替'")) {
    findings.push({
      level: 'error',
      source: 'DE.theme-toggle-title',
      message: '[DE] iter1971 theme-toggle title が aria-label と divergent',
    })
  }

  // ========= DD. comment-thread input title sweep (iter1969) =========
  const ctDD = read(here, `${root}/src/components/workspace/comment-thread.tsx`)
  if (!ctDD.includes('iter1969')) {
    findings.push({
      level: 'error',
      source: 'DD.comment-input',
      message: '[DD] iter1969 comment-thread input title が消えている',
    })
  }

  // ========= DC. personal-period goal textarea title sweep (iter1967) =========
  const periodDC = read(here, `${root}/src/components/workspace/personal-period-view.tsx`)
  if (!periodDC.includes('iter1967') || !periodDC.includes('ゴール (任意、最大 2000 文字')) {
    findings.push({
      level: 'error',
      source: 'DC.period-goal',
      message: '[DC] iter1967 period goal textarea title が消えている',
    })
  }

  // ========= DB. workspace main landmark title sweep (iter1965) =========
  const wsDB = read(here, `${root}/src/app/(workspace)/[workspaceId]/page.tsx`)
  if (
    !wsDB.includes(
      'title="Workspace dashboard — Today / Inbox / Kanban / Backlog / Gantt / Dashboard"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'DB.workspace-main',
      message: '[DB] iter1965 workspace main landmark title が消えている',
    })
  }

  // ========= DA. workspace nav landmark title sweep (iter1963) =========
  const wsDA = read(here, `${root}/src/app/(workspace)/[workspaceId]/page.tsx`)
  if (
    !wsDA.includes(
      'title="ワークスペース内 — Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'DA.workspace-nav',
      message: '[DA] iter1963 workspace nav landmark title が消えている',
    })
  }

  // ========= CZ. schedule-item-picker search title sweep (iter1961) =========
  const sipCZ = read(here, `${root}/src/components/schedule/schedule-item-picker.tsx`)
  if (!sipCZ.includes('iter1961')) {
    findings.push({
      level: 'error',
      source: 'CZ.picker-search',
      message: '[CZ] iter1961 schedule-item-picker search title が消えている',
    })
  }

  // ========= CY. calendar-view date nav group title sweep (iter1959) =========
  const calCY = read(here, `${root}/src/components/schedule/calendar-view.tsx`)
  if (!calCY.includes('title={`カレンダー日付ナビゲーション —')) {
    findings.push({
      level: 'error',
      source: 'CY.calendar-nav',
      message: '[CY] iter1959 calendar-view nav group title が消えている',
    })
  }

  // ========= CX. create-time-entry teCategory title sweep (iter1957) =========
  const cteCX = read(here, `${root}/src/components/time-entry/create-time-entry-form.tsx`)
  if (!cteCX.includes('iter1957')) {
    findings.push({
      level: 'error',
      source: 'CX.te-category',
      message: '[CX] iter1957 create-time-entry teCategory title が消えている',
    })
  }

  // ========= CW. create-time-entry teDate title sweep (iter1955) =========
  const cteCW = read(here, `${root}/src/components/time-entry/create-time-entry-form.tsx`)
  if (!cteCW.includes('iter1955')) {
    findings.push({
      level: 'error',
      source: 'CW.te-date',
      message: '[CW] iter1955 create-time-entry teDate title が消えている',
    })
  }

  // ========= CV. dashboard MUST Item 一覧 region title sweep (iter1953) =========
  const dvCV = read(here, `${root}/src/components/workspace/dashboard-view.tsx`)
  if (!dvCV.includes('title={`MUST Item 一覧 — ${s.items.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'CV.dashboard-must-region',
      message: '[CV] iter1953 dashboard MUST 一覧 region title が消えている',
    })
  }

  // ========= CU. active-timer-panel region title sweep (iter1951) =========
  const atpCU = read(here, `${root}/src/components/workspace/active-timer-panel.tsx`)
  if (!atpCU.includes('title={`タスクタイマー — 経過 ${formatElapsed(elapsedMs)}')) {
    findings.push({
      level: 'error',
      source: 'CU.active-timer-panel',
      message: '[CU] iter1951 active-timer-panel region title が消えている',
    })
  }

  // ========= CT. start-timer-button active title sweep (iter1949) =========
  const stCT = read(here, `${root}/src/components/workspace/start-timer-button.tsx`)
  if (!stCT.includes('title={`「${item.title}」を計測中 — 経過 ${formatElapsed(elapsedFn())}')) {
    findings.push({
      level: 'error',
      source: 'CT.start-timer-active',
      message: '[CT] iter1949 start-timer-button active title が消えている',
    })
  }

  // ========= CS. inbox-view GTD 分類 group title sweep (iter1947) =========
  const inboxCS = read(here, `${root}/src/components/workspace/inbox-view.tsx`)
  if (!inboxCS.includes('title={`GTD 分類 — 2 分以内')) {
    findings.push({
      level: 'error',
      source: 'CS.inbox-gtd',
      message: '[CS] iter1947 inbox-view GTD 分類 group title が消えている',
    })
  }

  // ========= CR. inbox-view region title sweep (iter1945) =========
  const inboxCR = read(here, `${root}/src/components/workspace/inbox-view.tsx`)
  if (!inboxCR.includes('title={`Inbox view — ${inbox.length} 件、scheduledFor も期限も未設定')) {
    findings.push({
      level: 'error',
      source: 'CR.inbox-region',
      message: '[CR] iter1945 inbox-view region title が消えている',
    })
  }

  // ========= CQ. operation-board-widget Card title sweep (iter1943) =========
  const opCQ = read(here, `${root}/src/components/workspace/operation-board-widget.tsx`)
  if (!opCQ.includes('title={`今日の作戦盤 — 期限超過')) {
    findings.push({
      level: 'error',
      source: 'CQ.op-board-region',
      message: '[CQ] iter1943 operation-board-widget Card title が消えている',
    })
  }

  // ========= CP. items-board filter-sprint title sweep (iter1941) =========
  const boardCP = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (!boardCP.includes('iter1941') || !boardCP.includes('「全 Sprint」で解除')) {
    findings.push({
      level: 'error',
      source: 'CP.filter-sprint',
      message: '[CP] iter1941 items-board filter-sprint title が消えている',
    })
  }

  // ========= CO. items-board filter-status title sweep (iter1939) =========
  const boardCO = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (!boardCO.includes('iter1939') || !boardCO.includes('「全ステータス」で解除')) {
    findings.push({
      level: 'error',
      source: 'CO.filter-status',
      message: '[CO] iter1939 items-board filter-status title が消えている',
    })
  }

  // ========= CN. items-board filter-must title sweep (iter1937) =========
  const boardCN = read(here, `${root}/src/components/workspace/items-board.tsx`)
  if (
    !boardCN.includes(
      "title={must ? 'MUST のみ表示中 — クリックで解除' : 'MUST のみ — 表示に絞り込む'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'CN.filter-must',
      message: '[CN] iter1937 items-board filter-must title が消えている',
    })
  }

  // ========= CM. goals-panel KR progressbar title sweep (iter1935) =========
  const gpCM = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpCM.includes('title={`KR「${kr.title}」進捗 ${pct}%`}')) {
    findings.push({
      level: 'error',
      source: 'CM.kr-progress',
      message: '[CM] iter1935 goals-panel KR progressbar title が消えている',
    })
  }

  // ========= CL. goals-panel progressbar title sweep (iter1933) =========
  const gpCL = read(here, `${root}/src/components/workspace/goals-panel.tsx`)
  if (!gpCL.includes('title={`Goal「${goal.title}」全体進捗 ${goalPct}%')) {
    findings.push({
      level: 'error',
      source: 'CL.goal-progress',
      message: '[CL] iter1933 goals-panel progressbar title が消えている',
    })
  }

  // ========= CK. sprints-panel progressbar title sweep (iter1931) =========
  const spCK = read(here, `${root}/src/components/workspace/sprints-panel.tsx`)
  if (!spCK.includes('title={`Sprint「${sprint.name}」完了率 ${pct}% —')) {
    findings.push({
      level: 'error',
      source: 'CK.sprint-progress',
      message: '[CK] iter1931 sprints-panel progressbar title が消えている',
    })
  }

  // ========= CJ. workflow-graph-canvas title sweep (iter1929) =========
  const wfgCJ = read(here, `${root}/src/components/workflow/workflow-graph-canvas.tsx`)
  if (!wfgCJ.includes('title={`Workflow graph —')) {
    findings.push({
      level: 'error',
      source: 'CJ.workflow-graph',
      message: '[CJ] iter1929 workflow-graph-canvas title が消えている',
    })
  }

  // ========= CI. cycle-check ステータス分布 grid title sweep (iter1927) =========
  const cycleCI = read(here, `${root}/src/components/pdca/cycle-check-stats-card.tsx`)
  if (!cycleCI.includes('title={`ステータス分布 —')) {
    findings.push({
      level: 'error',
      source: 'CI.cycle-status',
      message: '[CI] iter1927 cycle-check ステータス分布 grid title が消えている',
    })
  }

  // ========= CH. cycle-check Lead time grid title sweep (iter1925) =========
  const cycleCH = read(here, `${root}/src/components/pdca/cycle-check-stats-card.tsx`)
  if (!cycleCH.includes('title={`Lead time 統計 —')) {
    findings.push({
      level: 'error',
      source: 'CH.cycle-leadtime',
      message: '[CH] iter1925 cycle-check Lead time grid title が消えている',
    })
  }

  // ========= CG. sprint-retro-status-chip title sweep (iter1923) =========
  const retroCG = read(here, `${root}/src/components/sprint/sprint-retro-widget.tsx`)
  if (!retroCG.includes('title={`${label} ${count} 件 — ${toneLabel}`}')) {
    findings.push({
      level: 'error',
      source: 'CG.sprint-retro-status',
      message: '[CG] iter1923 sprint-retro-status-chip title が消えている',
    })
  }

  // ========= CF. sprint-retro 計画vs納品 grid title sweep (iter1921) =========
  const retroCF = read(here, `${root}/src/components/sprint/sprint-retro-widget.tsx`)
  if (!retroCF.includes('title={`計画 vs 納品 —')) {
    findings.push({
      level: 'error',
      source: 'CF.sprint-retro-grid',
      message: '[CF] iter1921 sprint-retro 計画vs納品 grid title が消えている',
    })
  }

  // ========= CE. top-items 合計 chip title sweep (iter1919) =========
  const topCE = read(here, `${root}/src/components/time-entry/top-items-by-time-chip.tsx`)
  if (!topCE.includes('title={`${label} — 合計`}')) {
    findings.push({
      level: 'error',
      source: 'CE.top-items-total',
      message: '[CE] iter1919 top-items 合計 chip title が消えている',
    })
  }

  // ========= CD. estimate-bias 内訳 grid title sweep (iter1917) =========
  const biasCD = read(here, `${root}/src/components/time-entry/estimate-bias-insight.tsx`)
  if (!biasCD.includes('title={`見積バイアス内訳 —')) {
    findings.push({
      level: 'error',
      source: 'CD.estimate-bias-grid',
      message: '[CD] iter1917 estimate-bias 内訳 grid title が消えている',
    })
  }

  // ========= CC. estimate-bias tendency title sweep (iter1915) =========
  const biasCC = read(here, `${root}/src/components/time-entry/estimate-bias-insight.tsx`)
  if (!biasCC.includes('title={`${label} — 傾向`}')) {
    findings.push({
      level: 'error',
      source: 'CC.estimate-bias-tendency',
      message: '[CC] iter1915 estimate-bias tendency title が消えている',
    })
  }

  // ========= CB. time-entries sync-badge-pending title sweep (iter1913) =========
  const ttCB = read(here, `${root}/src/components/time-entry/time-entries-table.tsx`)
  if (!ttCB.includes('title="pending — 外部同期 未実行"')) {
    findings.push({
      level: 'error',
      source: 'CB.sync-badge-pending',
      message: '[CB] iter1913 sync-badge-pending title が消えている',
    })
  }

  // ========= CA. template-items dueOffset title sweep (iter1911) =========
  const tmplCA = read(here, `${root}/src/components/template/template-items-editor.tsx`)
  if (!tmplCA.includes('title={`+${it.dueOffsetDays} 日 — 期日 offset`}')) {
    findings.push({
      level: 'error',
      source: 'CA.template-due-offset',
      message: '[CA] iter1911 template-items dueOffset title が消えている',
    })
  }

  // ========= BZ. notification-preferences icon title sweep (iter1909) =========
  const notifBZ = read(here, `${root}/src/components/workspace/notification-preferences.tsx`)
  if (!notifBZ.includes('title={`${visual.label}通知`}')) {
    findings.push({
      level: 'error',
      source: 'BZ.notif-pref-icon',
      message: '[BZ] iter1909 notification-preferences icon title が消えている',
    })
  }

  // ========= BY. item-deps DirectionIcon wrapper title sweep (iter1907) =========
  const depsBY = read(here, `${root}/src/components/workspace/item-dependencies-panel.tsx`)
  if (!depsBY.includes('<span title={srLabel}')) {
    findings.push({
      level: 'error',
      source: 'BY.deps-direction',
      message: '[BY] iter1907 item-deps DirectionIcon wrapper title が消えている',
    })
  }

  // ========= BX. activity-log actor chip title sweep (iter1905) =========
  const activityBX = read(here, `${root}/src/components/workspace/activity-log.tsx`)
  if (
    !activityBX.includes(
      "title={entry.actorType === 'agent' ? 'AI Agent — 実行者' : 'ユーザ — 実行者'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'BX.activity-actor',
      message: '[BX] iter1905 activity-log actor chip title が消えている',
    })
  }

  // ========= BW. activity-log action icon title sweep (iter1903) =========
  const activityBW = read(here, `${root}/src/components/workspace/activity-log.tsx`)
  if (!activityBW.includes('title={`${label} — 操作種別`}')) {
    findings.push({
      level: 'error',
      source: 'BW.activity-icon',
      message: '[BW] iter1903 activity-log action icon title が消えている',
    })
  }

  // ========= BV. activity-log hint title sweep (iter1901) =========
  const activityBV = read(here, `${root}/src/components/workspace/activity-log.tsx`)
  if (!activityBV.includes('title={`${hint.label} — Activity 状態`}')) {
    findings.push({
      level: 'error',
      source: 'BV.activity-hint',
      message: '[BV] iter1901 activity-log hint title が消えている',
    })
  }

  // ========= BU. integrations ImportStatusBadge title sweep (iter1899) =========
  const integBU = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (!integBU.includes('title={`${label} — Pull ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'BU.integrations-status',
      message: '[BU] iter1899 integrations ImportStatusBadge title が消えている',
    })
  }

  // ========= BT. integrations Pull count title sweep (iter1897) =========
  const integBT = read(here, `${root}/src/components/integrations/integrations-panel.tsx`)
  if (
    !integBT.includes(
      'title={`fetched ${r.fetchedCount} / created ${r.createdCount} / updated ${r.updatedCount}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'BT.integrations-pull',
      message: '[BT] iter1897 integrations Pull count title が消えている',
    })
  }

  // ========= BS. pdca Lead time grid title sweep (iter1895) =========
  const pdcaBS = read(here, `${root}/src/components/workspace/pdca-panel.tsx`)
  if (!pdcaBS.includes('iter1895') || !pdcaBS.includes('title={`Lead time 内訳')) {
    findings.push({
      level: 'error',
      source: 'BS.pdca-leadtime',
      message: '[BS] iter1895 pdca Lead time grid title が消えている',
    })
  }

  // ========= BR. weekly-insight by-day grid title sweep (iter1893) =========
  const weeklyBR = read(here, `${root}/src/components/workspace/weekly-insight-widget.tsx`)
  if (!weeklyBR.includes('iter1893') || !weeklyBR.includes('title={`曜日別完了件数')) {
    findings.push({
      level: 'error',
      source: 'BR.weekly-by-day',
      message: '[BR] iter1893 weekly by-day grid title が消えている',
    })
  }

  // ========= BQ. pdca distribution bar title sweep (iter1891) =========
  const pdcaBQ = read(here, `${root}/src/components/workspace/pdca-panel.tsx`)
  if (!pdcaBQ.includes('iter1891')) {
    findings.push({
      level: 'error',
      source: 'BQ.pdca-distribution',
      message: '[BQ] iter1891 pdca distribution bar title が消えている',
    })
  }

  // ========= BP. quick-add calibrated chip title sweep (iter1889) =========
  const quickAddBP = read(here, `${root}/src/components/workspace/quick-add.tsx`)
  if (!quickAddBP.includes('iter1889') || !quickAddBP.includes('校正後')) {
    findings.push({
      level: 'error',
      source: 'BP.quick-add-calibrated',
      message: '[BP] iter1889 quick-add calibrated chip title が消えている',
    })
  }

  // ========= BO. quick-add estimate chip title sweep (iter1887) =========
  const quickAddBO = read(here, `${root}/src/components/workspace/quick-add.tsx`)
  if (!quickAddBO.includes('title={`${formatEstimate(preview.estimateMinutes)} — 見積`}')) {
    findings.push({
      level: 'error',
      source: 'BO.quick-add-estimate',
      message: '[BO] iter1887 quick-add estimate chip title が消えている',
    })
  }

  // ========= BN. subtasks-panel step 番号 title sweep (iter1885) =========
  const subtasksBN = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  if (!subtasksBN.includes('title={`${index + 1} 番目 — 深さ ${depth + 1}`}')) {
    findings.push({
      level: 'error',
      source: 'BN.subtasks-step',
      message: '[BN] iter1885 subtasks step 番号 title が消えている',
    })
  }

  // ========= BM. subtasks-panel child-count title sweep (iter1883) =========
  const subtasksBM = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  if (
    !subtasksBM.includes('title={`このタスクには子タスクが ${grandchildren.length} 件あります`}')
  ) {
    findings.push({
      level: 'error',
      source: 'BM.subtasks-childcount',
      message: '[BM] iter1883 subtasks child-count title が消えている',
    })
  }

  // ========= BL. team-capacity member name title sweep (iter1881) =========
  const teamCapBL = read(here, `${root}/src/components/workspace/team-capacity-panel.tsx`)
  if (!teamCapBL.includes('title={`${name} — member`}')) {
    findings.push({
      level: 'error',
      source: 'BL.team-capacity-name',
      message: '[BL] iter1881 team-capacity member name title が消えている',
    })
  }

  // ========= BK. swimlane population title sweep (iter1879) =========
  const swimlaneBK = read(here, `${root}/src/components/workspace/sprint-swimlane-disclosure.tsx`)
  if (!swimlaneBK.includes('title={`${populationLabel} — Sprint 全体`}')) {
    findings.push({
      level: 'error',
      source: 'BK.swimlane-population',
      message: '[BK] iter1879 swimlane population title が消えている',
    })
  }

  // ========= BJ. gantt-view inline MUST chip title sweep (iter1877) =========
  const ganttViewBJ = read(here, `${root}/src/components/workspace/gantt-view.tsx`)
  if (!ganttViewBJ.includes('iter1877') || !ganttViewBJ.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'BJ.gantt-must-inline',
      message: '[BJ] iter1877 gantt inline MUST chip title が消えている',
    })
  }

  // ========= BI. today-view dueTime chip title sweep (iter1875) =========
  const todayViewBI = read(here, `${root}/src/components/workspace/today-view.tsx`)
  if (!todayViewBI.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'BI.today-due-time',
      message: '[BI] iter1875 today-view dueTime chip title が消えている',
    })
  }

  // ========= BH. backlog DragHandle title sweep (iter1873) =========
  // (backlog-view 全 polish 検査をここに集約)
  const backlogView2 = read(here, `${root}/src/components/workspace/backlog-view.tsx`)
  if (!backlogView2.includes('title="ドラッグで並び替え"')) {
    findings.push({
      level: 'error',
      source: 'BH.backlog-drag-handle',
      message: '[BH] iter1873 backlog DragHandle title が消えている',
    })
  }

  // ========= BG. backlog estimate-summary chip title sweep (iter1871) =========
  const backlogView = read(here, `${root}/src/components/workspace/backlog-view.tsx`)
  if (!backlogView.includes('title={`${estimateSummary} — Backlog 見積サマリ`}')) {
    findings.push({
      level: 'error',
      source: 'BG.backlog-estimate',
      message: '[BG] iter1871 backlog estimate-summary chip title が消えている',
    })
  }

  // ========= BF. kanban child-count chip title sweep (iter1869) =========
  const kanbanView = read(here, `${root}/src/components/workspace/kanban-view.tsx`)
  if (!kanbanView.includes('title={`子タスク ${childCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'BF.kanban-child-count',
      message: '[BF] iter1869 kanban child-count chip title が消えている',
    })
  }

  // ========= BE. command-palette priority dot title sweep (iter1867) =========
  const cmdPalette = read(here, `${root}/src/components/shared/command-palette.tsx`)
  if (!cmdPalette.includes('title={`p${item.priority ?? 4}`}')) {
    findings.push({
      level: 'error',
      source: 'BE.palette-priority',
      message: '[BE] iter1867 palette priority dot title が消えている',
    })
  }

  // ========= BD. taskchute priority chip title sweep (iter1865) =========
  const taskchuteView = read(here, `${root}/src/components/workspace/taskchute-view.tsx`)
  if (!taskchuteView.includes('title={`P${item.priority ?? 4}`}')) {
    findings.push({
      level: 'error',
      source: 'BD.taskchute-priority',
      message: '[BD] iter1865 taskchute priority chip title が消えている',
    })
  }

  // ========= BC. personal-period-view priority dot title sweep (iter1863) =========
  const periodView = read(here, `${root}/src/components/workspace/personal-period-view.tsx`)
  if (!periodView.includes('title={`p${it.priority ?? 4}`}')) {
    findings.push({
      level: 'error',
      source: 'BC.period-priority',
      message: '[BC] iter1863 period priority dot title が消えている',
    })
  }

  // ========= BB. inbox-health-hint chip title sweep (iter1861) =========
  const inboxView = read(here, `${root}/src/components/workspace/inbox-view.tsx`)
  if (!inboxView.includes('title={`${healthChip.label} — Inbox 健全性`}')) {
    findings.push({
      level: 'error',
      source: 'BB.inbox-health',
      message: '[BB] iter1861 inbox-health-hint title が消えている',
    })
  }

  // ========= BA. time-entries sync-badge title sweep (iter1859) =========
  const teTable = read(here, `${root}/src/components/time-entry/time-entries-table.tsx`)
  if (
    !teTable.includes('title="synced — 外部同期 完了"') ||
    !teTable.includes('title="failed — 外部同期 失敗"')
  ) {
    findings.push({
      level: 'error',
      source: 'BA.sync-badges',
      message: '[BA] iter1859 sync-badge synced/failed title が消えている',
    })
  }

  // ========= AZ. wf-run-status Badge title sweep (iter1857) =========
  if (!wfPanel.includes('title={`${label} — 実行ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'AZ.wf-run-status',
      message: '[AZ] iter1857 wf-run-status Badge title が消えている',
    })
  }

  // ========= AY. goal-status Badge title sweep (iter1855) =========
  if (
    !goalsPanelAF.includes(
      'title={`${goalStatusLabelJa(status)} — Goal「${goal.title}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AY.goal-status',
      message: '[AY] iter1855 goal-status Badge title が消えている',
    })
  }

  // ========= AX. sprint-status Badge title sweep (iter1853) =========
  if (
    !sprintsPanel.includes(
      'title={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AX.sprint-status',
      message: '[AX] iter1853 sprint-status Badge title が消えている',
    })
  }

  // ========= AW. active-timer-estimate-calibrated chip title sweep (iter1851) =========
  if (
    !activeTimer.includes(
      "title={`${calibrated.calibratedMinutes}分 — 校正後 ${calibrated.deltaMinutes > 0 ? '+' : ''}${calibrated.deltaMinutes}分、中央値 ${calibrationFactor?.toFixed(2)}× 補正`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AW.calibrated',
      message: '[AW] iter1851 calibrated chip title が消えている',
    })
  }

  // ========= AV. notification-bell unreadBreakdown chip title sweep (iter1849) =========
  if (!notifBell.includes('title={`${unreadBreakdown} — 未読内訳`}')) {
    findings.push({
      level: 'error',
      source: 'AV.unread-breakdown',
      message: '[AV] iter1849 unreadBreakdown title が aria-label と一致しない',
    })
  }

  // ========= AU. notification-bell-hint chip title sweep (iter1847) =========
  if (!notifBell.includes('title={`${hint.label} — 通知 健全性`}')) {
    findings.push({
      level: 'error',
      source: 'AU.notif-hint',
      message: '[AU] iter1847 notification-bell-hint title が消えている',
    })
  }

  // ========= AT. comment-thread AI Agent badge title sweep (iter1845) =========
  // commentThread は R 軸で既に読込済
  if (!commentThread.includes('title="AI Agent による投稿"')) {
    findings.push({
      level: 'error',
      source: 'AT.ai-badge',
      message: '[AT] iter1845 comment-thread AI Agent badge title が消えている',
    })
  }

  // ========= AS. MustBadge title sweep (iter1843) =========
  const mustBadge = read(here, `${root}/src/components/workspace/must-badge.tsx`)
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'AS.must-badge',
      message: '[AS] iter1843 MustBadge title が消えている',
    })
  }

  // ========= AR. StatusBadge title sweep (iter1841) =========
  const statusBadge = read(here, `${root}/src/components/workspace/status-badge.tsx`)
  if (!statusBadge.includes('title={`${cfg.shortLabel} — ステータス ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'AR.status-badge',
      message: '[AR] iter1841 StatusBadge title が消えている',
    })
  }

  // ========= AQ. home workspace-link Link title sweep (iter1839) =========
  // homePage は N 軸で既に読込済 (line 277)
  if (!homePage.includes('title={`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`}')) {
    findings.push({
      level: 'error',
      source: 'AQ.workspace-link',
      message: '[AQ] iter1839 home workspace-link title が消えている',
    })
  }

  // ========= AP. operation-board-forecast chip title sweep (iter1837) =========
  const opBoard = read(here, `${root}/src/components/workspace/operation-board-widget.tsx`)
  if (!opBoard.includes('title={`今日完了予測 ${formatTodayForecastJa(forecast)}`}')) {
    findings.push({
      level: 'error',
      source: 'AP.forecast-chip',
      message: '[AP] iter1837 operation-board-forecast title が消えている',
    })
  }

  // ========= AO. WorkspaceHeader role Badge title sweep (iter1835) =========
  const wsHeader = read(here, `${root}/src/components/workspace/workspace-header.tsx`)
  if (!wsHeader.includes('title={`${role} — あなたの workspace role`}')) {
    findings.push({
      level: 'error',
      source: 'AO.role-badge',
      message: '[AO] iter1835 WorkspaceHeader role Badge title が消えている',
    })
  }

  // ========= AN. schedule-picker footer title sweep (iter1833) =========
  const picker = read(here, `${root}/src/components/schedule/schedule-item-picker.tsx`)
  if (
    !picker.includes('title="キャンセル — task pick を破棄"') ||
    !picker.includes(
      "title={`割込みとして追加 — 割込み / 休憩として追加${interruptNote ? ` (メモ: ${interruptNote})` : ''}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AN.schedule-picker-footer',
      message: '[AN] iter1833 schedule-picker footer 2 button title が消えている',
    })
  }

  // ========= AM. archive-restore title sweep (iter1831) =========
  const archivePanel = read(here, `${root}/src/components/workspace/archived-items-panel.tsx`)
  if (
    !archivePanel.includes(
      '`復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AM.archive-restore',
      message: '[AM] iter1831 archive-restore default path text が消えている',
    })
  }

  // ========= AL. subtask-drag title sweep (iter1829) =========
  const subtasksPanel = read(here, `${root}/src/components/workspace/subtasks-panel.tsx`)
  if (!subtasksPanel.includes('title={`${item.title} — ドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'AL.subtask-drag',
      message: '[AL] iter1829 subtask-drag title が消えている',
    })
  }

  // ========= AK. bulk-action-bar title sweep (iter1827) =========
  const bulkBar = read(here, `${root}/src/components/workspace/bulk-action-bar.tsx`)
  if (
    !bulkBar.includes('title="解除 — 選択を全て解除"') ||
    !bulkBar.includes('`削除 — 選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)`')
  ) {
    findings.push({
      level: 'error',
      source: 'AK.bulk-action',
      message: '[AK] iter1827 bulk-action-bar title が消えている',
    })
  }

  // ========= AJ. sprint-swimlane summary title sweep (iter1825) =========
  const swimlane = read(here, `${root}/src/components/workspace/sprint-swimlane-disclosure.tsx`)
  if (
    !swimlane.includes(
      '`担当者ビュー (swim-lane Gantt) を開く — Sprint「${sprintName}」の担当者 swim-lane Gantt を開く`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AJ.swimlane',
      message: '[AJ] iter1825 sprint-swimlane summary open path text が消えている',
    })
  }

  // ========= AI. proposal-edit footer title sweep (iter1823) =========
  const decomposePanel = read(
    here,
    `${root}/src/components/workspace/decompose-proposals-panel.tsx`,
  )
  if (!decomposePanel.includes('title={`キャンセル — 提案「${proposal.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'AI.proposal-edit',
      message: '[AI] iter1823 proposal-edit-cancel title が消えている',
    })
  }
  if (
    !decomposePanel.includes(
      '`保存 — 提案「${proposal.title}」の編集を保存 (Cmd/Ctrl+Enter でも可)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AI.proposal-edit',
      message: '[AI] iter1823 proposal-save default path text が消えている',
    })
  }

  // ========= AH. notification-item title sweep (iter1821) =========
  if (
    !notifBell.includes(
      "title={`${formatNotificationBody(n)} — ${n.readAt ? '既読' : '未読'}${visual.label}通知 — ${formatRelativeTime(n.createdAt)}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'AH.notification-item',
      message: '[AH] iter1821 notification-item title が消えている',
    })
  }

  // ========= AA. notification-bell mark-all-read title sweep (iter1807) =========
  if (
    !notifBell.includes("'全て既読 — 未読通知がないため既読化不要'") ||
    !notifBell.includes('`全て既読 — 未読 ${unreadCount} 件を既読化中…`') ||
    !notifBell.includes('`全て既読 — 未読 ${unreadCount} 件をすべて既読にする`')
  ) {
    findings.push({
      level: 'error',
      source: 'AA.mark-all-read',
      message: '[AA] iter1807 mark-all-read conditional 3 path text が消えている',
    })
  }

  // ========= Z. offline page title sweep (iter1805) =========
  const retryBtn = read(here, `${root}/src/app/~offline/retry-button.tsx`)
  if (!retryBtn.includes('title="再読み込みして再試行 — ページ全体を読み直して接続を回復"')) {
    findings.push({
      level: 'error',
      source: 'Z.offline-title',
      message: '[Z] iter1805 offline retry-button title が消えている',
    })
  }
  if (
    !offlinePage.includes(
      'title="ホームに戻る — アプリの起点画面に遷移、オンライン復帰後は最新状態を表示"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'Z.offline-title',
      message: '[Z] iter1805 offline-home-link title が消えている',
    })
  }

  // ========= Y. auth cross-link title sweep (iter1803) =========
  // signup-link (login page) + login-link (signup page) に title 付与
  const loginPage = read(here, `${root}/src/app/(auth)/login/page.tsx`)
  const signupPageY = read(here, `${root}/src/app/(auth)/signup/page.tsx`)
  if (!loginPage.includes('title="サインアップ — アカウント未作成の方はこちらから新規登録"')) {
    findings.push({
      level: 'error',
      source: 'Y.auth-cross',
      message: '[Y] iter1803 login/page signup-link title が消えている',
    })
  }
  if (!signupPageY.includes('title="ログイン — 既にアカウントをお持ちの方はこちら"')) {
    findings.push({
      level: 'error',
      source: 'Y.auth-cross',
      message: '[Y] iter1803 signup/page login-link title が消えている',
    })
  }

  // ========= X. back-link title sweep (iter1801) =========
  // 8 sub-page (goals/sprints/pdca/templates/workflows/integrations/time-entries/archive) +
  // workspace home back-to-workspaces 計 9 Link に title 付与
  for (const sub of [
    'goals',
    'sprints',
    'pdca',
    'templates',
    'workflows',
    'integrations',
    'time-entries',
    'archive',
  ]) {
    const src = read(here, `${root}/src/app/(workspace)/[workspaceId]/${sub}/page.tsx`)
    if (!src.includes('title="Workspace dashboard に戻る"')) {
      findings.push({
        level: 'error',
        source: 'X.back-link',
        message: `[X] iter1801 ${sub} sub-page back-to-Workspace title が消えている`,
      })
    }
  }
  if (!workspacePage.includes('title="一覧 — Workspace 一覧へ戻る"')) {
    findings.push({
      level: 'error',
      source: 'X.back-link',
      message: '[X] iter1801 workspace home back-to-workspaces title が消えている',
    })
  }

  // ========= W. creation form submit title sweep (iter1799) =========
  const createWs = read(here, `${root}/src/components/workspace/create-workspace-form.tsx`)
  if (
    !createWs.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'W.create-submit',
      message: '[W] iter1799 create-workspace-submit title が消えている',
    })
  }
  const createTe = read(here, `${root}/src/components/time-entry/create-time-entry-form.tsx`)
  if (
    !createTe.includes("title={create.isPending ? '稼働記録を作成中…' : '記録 — 稼働記録を作成'}")
  ) {
    findings.push({
      level: 'error',
      source: 'W.create-submit',
      message: '[W] iter1799 create-time-entry-submit title が消えている',
    })
  }

  // ========= N. logout button title sweep (iter1781) =========
  // homePage は C 軸で既に読込済 (line 277)
  if (!homePage.includes('title="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'N.logout-title',
      message: '[N] iter1781 home page logout title が消えている',
    })
  }
  if (!mockTopNav.includes('title="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'N.logout-title',
      message: '[N] iter1781 mock-top-nav logout title が消えている',
    })
  }

  // ========= K. shared ErrorState retry title (iter1767) =========
  const asyncStates = read(here, `${root}/src/components/shared/async-states.tsx`)
  if (!asyncStates.includes('title={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'K.error-retry',
      message: '[K] iter1767 ErrorState retry title が消えている',
    })
  }

  // ========= G. WCAG 2.4.1 skip-link =========
  if (
    !rootLayout.includes('href="#main-content"') ||
    !rootLayout.includes('メインコンテンツへスキップ')
  ) {
    findings.push({
      level: 'error',
      source: 'G.skip-link',
      message: '[G] skip-link が消えている',
    })
  }

  // ========= H. workspace-header / page metadata =========
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'H.header',
      message: '[H] iter1722 mock-top-nav sessionId truncate が消えている',
    })
  }
  const mockLoginPage = read(here, `${root}/src/app/mock-timesheet/login/page.tsx`)
  if (!mockLoginPage.includes('aria-labelledby="mock-login-heading"')) {
    findings.push({
      level: 'error',
      source: 'H.header',
      message: '[H] iter1719 mock-login main aria-labelledby が消えている',
    })
  }

  console.log('=== Findings (a11y-sweep-suite iter1760) ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — iter1714-1759 sweep の全 polish (A: data-testid / B: title / C: em-dash / D: id-prefix / E: reduced-motion / F: table / G: skip-link / H: header) 全 軸 不変',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
