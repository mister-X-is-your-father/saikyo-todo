/**
 * Phase 6.15 loop iter1728: root layout の skip-to-main link に data-testid="skip-to-main"
 * 付与。WCAG 2.4.1 (Bypass Blocks) の E2E test を全 page で 1 selector で書けるように。
 *
 * 発見した testability gap:
 *   - src/app/layout.tsx の skip-link は `<a href="#main-content">メインコンテンツへスキップ</a>`
 *   - 全 page (login / signup / offline / mock-* / workspace) で root layout が wrap、
 *     全 page で同 skip-link が存在
 *   - data-testid 未設定 → Playwright で `page.locator('a[href="#main-content"]')` か
 *     `page.getByText('メインコンテンツへスキップ')` で発見する必要、selector が長く
 *     fragile (text 変更で test 壊れる)
 *
 * 影響: WCAG 2.4.1 (Bypass Blocks) compliance E2E test を全 page で書く際、selector
 *   pattern が長く writer の cognitive load 上昇。
 *
 * 修正 (src/app/layout.tsx, 1 line + 3 line comment):
 *   skip-link に `data-testid="skip-to-main"` 付与。href / className / textContent は
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 効果: Playwright pattern:
 *   - `await page.locator('[data-testid="skip-to-main"]').focus()` で keyboard focus
 *   - `await page.keyboard.press('Enter')` → main へジャンプ確認
 *   - 全 page 一律 selector で WCAG 2.4.1 E2E test 可能
 *
 * 実行: pnpm tsx scripts/explore-uiux-skip-to-main-testid-iter1728.ts
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

  const rootLayout = readFileSync(resolve(here, '../src/app/layout.tsx'), 'utf8')

  // --- 1. skip-link に data-testid="skip-to-main" 付与済 ---
  if (!rootLayout.includes('data-testid="skip-to-main"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx skip-link に data-testid="skip-to-main" が無い',
    })
  }

  // --- 2. href="#main-content" 維持 ---
  if (!rootLayout.includes('href="#main-content"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx skip-link の href="#main-content" が消えている',
    })
  }

  // --- 3. visible text "メインコンテンツへスキップ" 維持 ---
  if (!rootLayout.includes('メインコンテンツへスキップ')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx skip-link の visible text が消えている',
    })
  }

  // --- 4. sr-only + focus:not-sr-only pattern 維持 (visual a11y 不変) ---
  if (!rootLayout.includes('sr-only') || !rootLayout.includes('focus:not-sr-only')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx skip-link の sr-only / focus:not-sr-only pattern が消えている',
    })
  }

  // --- 5. focus:min-h-11 focus:min-w-11 (44x44 tap target) 維持 ---
  if (!rootLayout.includes('focus:min-h-11') || !rootLayout.includes('focus:min-w-11')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'layout.tsx skip-link の 44x44 (min-h-11/min-w-11) tap target が消えている',
    })
  }

  // --- 6. iter1727 reference invariant: gantt-view reduced-motion 維持 ---
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!ganttView.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1727 gantt-view prefers-reduced-motion check が消えている',
    })
  }

  // --- 7. iter1726 reference invariant: focusElementById reduced-motion 維持 ---
  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  if (!focusUtil.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1726 focusElementById prefers-reduced-motion check が消えている',
    })
  }

  // --- 8. iter1725 reference invariant: auth form data-testid 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  if (!loginForm.includes('data-testid="login-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1725 login-form data-testid が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — skip-link に data-testid="skip-to-main" 付与済、全 page で WCAG 2.4.1 E2E test 標準 selector で書ける、iter1727 / iter1726 / iter1725 invariant 不変',
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
