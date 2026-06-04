/**
 * Phase 6.15 loop iter1758: mock-login-form seed credential <p> に data-testid 付与
 * (iter1717 mock-login-form / mock-login-submit と pair で mock-timesheet 全要素 selectable)。
 *
 * 発見した testability gap:
 *   src/components/mock-timesheet/mock-login-form.tsx の seed credential <p>
 *   (line 138 旧: `<p className="text-muted-foreground text-xs">開発用: <code>...</code></p>`)
 *   は dev / Playwright test target 用の固定 credentials を表示するが data-testid 未設定、
 *   Playwright で「seed credentials 表示されている」 verify が getByText 等 fragile。
 *
 * 修正 (src/components/mock-timesheet/mock-login-form.tsx, 1 line + 3 line comment):
 *   <p> に `data-testid="mock-login-seed"` 付与。className / textContent (`<code>` 内含む)
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-login-seed-testid-iter1758.ts
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

  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )

  // --- 1. seed <p> に data-testid="mock-login-seed" 付与済 ---
  if (!mockLoginForm.includes('data-testid="mock-login-seed"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx seed <p> に data-testid="mock-login-seed" が無い',
    })
  }

  // --- 2. seed text 維持 (開発用: ops@example.com / password1234) ---
  if (!mockLoginForm.includes('<code>ops@example.com</code> / <code>password1234</code>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx seed text が消えている',
    })
  }

  // --- 3. iter1717 mock-login-form data-testid 維持 ---
  if (
    !mockLoginForm.includes('data-testid="mock-login-form"') ||
    !mockLoginForm.includes('data-testid="mock-login-submit"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1717 mock-login-form data-testid 2 個のいずれかが消えている',
    })
  }

  // --- 4. iter1757 mock-top-nav nav-* data-testid 維持 ---
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (
    !mockTopNav.includes('data-testid="mock-nav-new"') ||
    !mockTopNav.includes('data-testid="mock-nav-entries"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1757 mock-top-nav nav-* data-testid のいずれかが消えている',
    })
  }

  // --- 5. iter1731 workspace nav 8 link data-testid 維持 ---
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

  // --- 6. iter1722 mock-top-nav sessionId truncate 維持 ---
  if (!mockTopNav.includes('{sessionId.slice(0, 8)}…')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1722 mock-top-nav sessionId truncate が消えている',
    })
  }

  // --- 7. iter1718 mock-top-nav logout form brief aria-label 維持 ---
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1718 mock-top-nav logout form aria-label が消えている',
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
      '(なし) — mock-login-form seed <p> に data-testid 付与で mock-timesheet 全要素 selectable、iter1757-1732 invariant 不変',
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
