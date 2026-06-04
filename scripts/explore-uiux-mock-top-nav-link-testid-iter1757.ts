/**
 * Phase 6.15 loop iter1757: mock-top-nav の Links 2 個 (新規入力 / 入力一覧) に data-testid
 * 付与 (iter1731 workspace nav sweep の mock-timesheet counterpart)。
 *
 * 発見した testability gap:
 *   src/components/mock-timesheet/mock-top-nav.tsx の 2 Links (Link to /mock-timesheet/new
 *   と Link to /mock-timesheet/entries) は aria-current で active state を持つが data-testid
 *   未設定、Playwright で `a[href="/mock-timesheet/new"]` で発見、selector が長く dynamic
 *   workspaceId なしの mock route なのでまだマシだが、auth-flow tests で workspace nav
 *   (iter1731) と同 sweep pattern で書けない。
 *
 * 修正 (src/components/mock-timesheet/mock-top-nav.tsx, 2 line 追加 + 4 line comment):
 *   - 新規入力 Link に `data-testid="mock-nav-new"` 付与
 *   - 入力一覧 Link に `data-testid="mock-nav-entries"` 付与
 *   - href / aria-current / visible text 完全不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-top-nav-link-testid-iter1757.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))

  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )

  // --- 1. mock-nav-new data-testid 付与済 ---
  if (!mockTopNav.includes('data-testid="mock-nav-new"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx に data-testid="mock-nav-new" が無い',
    })
  }

  // --- 2. mock-nav-entries data-testid 付与済 ---
  if (!mockTopNav.includes('data-testid="mock-nav-entries"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx に data-testid="mock-nav-entries" が無い',
    })
  }

  // --- 3. aria-current 維持 (iter1085) ---
  if (!mockTopNav.includes("aria-current={isNew ? 'page' : undefined}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx の aria-current pattern が消えている',
    })
  }

  // --- 4. iter1731 reference invariant: workspace nav 8 link data-testid 維持 ---
  const workspacePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  const navTestIds = (workspacePage.match(/data-testid="nav-[a-z-]+"/g) ?? []).length
  if (navTestIds !== 8) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1731 workspace nav-* data-testid 件数が ${navTestIds} (期待 8)`,
    })
  }

  // --- 5. iter1718 mock-top-nav logout form 不変 ---
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1718 mock-top-nav logout form aria-label が消えている',
    })
  }

  // --- 6. iter1722 mock-top-nav sessionId truncate 維持 ---
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1722 mock-top-nav sessionId truncate が消えている',
    })
  }

  // --- 7. iter1754 ItemEditDialog DialogTitle title 維持 ---
  const dialog = readFileSync(
    resolve(here, '../src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (!dialog.match(/<span className="truncate" title=\{item\.title\}>/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1754 ItemEditDialog DialogTitle title が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-top-nav Links 2 個に data-testid 付与で auth-flow tests pattern 統一、iter1754 / iter1732 / iter1731 / iter1722 / iter1718 invariant 不変',
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
