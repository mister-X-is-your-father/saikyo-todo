/**
 * Phase 6.15 loop iter1759: mock-submit-form の Button に data-testid 付与 (iter1717
 * mock-login-form / login-form / signup-form の sibling counterpart、auth-flow tests
 * 全 submit button selectable 達成)。
 *
 * 発見した testability gap:
 *   src/components/mock-timesheet/mock-submit-form.tsx の Button (line 181-198) は
 *   `id="tsSubmit"` (legacy) を持つが data-testid 未設定、Playwright で auth-flow tests を
 *   `[data-testid$="-submit"]` 一括発見 pattern (login-submit / signup-submit /
 *   mock-login-submit + tsSubmit) で書けない。
 *
 *   form 名は "mock-submit-form" で suffix -submit 化すると "mock-submit-submit" の二重に
 *   なるため、`data-testid="mock-submit-action"` (-action suffix) を採用、legacy id="tsSubmit"
 *   は iter1717 同様維持で旧 test 互換。
 *
 * 修正 (src/components/mock-timesheet/mock-submit-form.tsx, 1 line + 5 line comment):
 *   <Button> に `data-testid="mock-submit-action"` 付与。id="tsSubmit" / aria-label /
 *   className / disabled / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-submit-action-testid-iter1759.ts
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

  const mockSubmitForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // --- 1. Button に data-testid="mock-submit-action" 付与済 ---
  if (!mockSubmitForm.includes('data-testid="mock-submit-action"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx Button に data-testid="mock-submit-action" が無い',
    })
  }

  // --- 2. legacy id="tsSubmit" 維持 (iter1717 同様 legacy 互換) ---
  if (!mockSubmitForm.includes('id="tsSubmit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx Button の legacy id="tsSubmit" が消えている',
    })
  }

  // --- 3. iter1094 / iter1181 aria-label em-dash convention 維持 ---
  if (
    !mockSubmitForm.includes("'送信 — 工数を送信 (mock-timesheet 入力フォーム)'") ||
    !mockSubmitForm.includes("'送信中… — mock-timesheet 工数送信処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx aria-label em-dash convention が消えている',
    })
  }

  // --- 4. data-testid="mock-submit-form" 維持 (form-level) ---
  if (!mockSubmitForm.includes('data-testid="mock-submit-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx form data-testid が消えている',
    })
  }

  // --- 5. iter1758 mock-login-seed data-testid 維持 ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (!mockLoginForm.includes('data-testid="mock-login-seed"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1758 mock-login-seed data-testid が消えている',
    })
  }

  // --- 6. iter1757 mock-top-nav nav-* data-testid 維持 ---
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

  // --- 7. iter1717 mock-login-form data-testid 維持 ---
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
      '(なし) — mock-submit-form Button に data-testid="mock-submit-action" 付与、mock-timesheet 全 form/button selectable 完成、iter1758-1732 invariant 不変',
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
