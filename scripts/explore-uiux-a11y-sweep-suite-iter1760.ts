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
    [
      `${root}/src/components/workspace/operation-board-widget.tsx`,
      'title={item.title}',
      'operation-board',
    ],
    [`${root}/src/components/workspace/taskchute-view.tsx`, 'title={item.title}', 'taskchute'],
    [`${root}/src/components/workspace/inbox-view.tsx`, 'title={it.title}', 'inbox'],
    [`${root}/src/components/workspace/today-view.tsx`, 'title={it.title}', 'today'],
    [`${root}/src/components/workspace/personal-period-view.tsx`, 'title={it.title}', 'period'],
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
    [`${root}/src/components/workspace/dashboard-view.tsx`, 'title={item.title}', 'dashboard MUST'],
    [`${root}/src/components/workspace/dashboard-view.tsx`, 'title={item.dod}', 'dashboard DoD'],
    [
      `${root}/src/components/workspace/decompose-proposals-panel.tsx`,
      'title={proposal.title}',
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
    [
      `${root}/src/components/schedule/schedule-item-picker.tsx`,
      'title={it.title}',
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
