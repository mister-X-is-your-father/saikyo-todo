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

  // ========= J. icon-only button title sweep (iter1763 / 1764 / 1765) =========
  const themeToggle = read(here, `${root}/src/components/shared/theme-toggle.tsx`)
  if (
    !themeToggle.match(
      /title=\{\s*\n?\s*resolvedTheme === 'dark' \? 'ライトテーマに切替' : 'ダークテーマに切替'\s*\n?\s*\}/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'J.icon-only-title',
      message: '[J] iter1763 theme-toggle conditional title が消えている',
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
