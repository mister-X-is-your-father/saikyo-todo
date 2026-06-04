/**
 * Phase 6.15 loop iter1717: mock-login-form に data-testid 2 個 (form + submit) を付与し
 * mock-submit-form / login-form / signup-form / offline retry-button (iter1716) の
 * data-testid convention と統一。
 *
 * 発見した asymmetry:
 *   - mock-submit-form: form-level `data-testid="mock-submit-form"` を持つ
 *   - login-form: Button-level `data-testid="login-submit"` を持つ
 *   - iter1714 signup/page.tsx link: `data-testid="login-link"`
 *   - iter1716 offline page action 2 個: `data-testid="offline-{retry-button,home-link}"`
 *   - 一方 mock-login-form: form-level / Button-level の data-testid 共に未設定
 *     (id="tsLoginSubmit" は持つが data-testid convention と divergent)
 *
 * 影響: Playwright で mock-timesheet の login / submit form を 1 pattern で発見できない、
 *   auth flow 全体の自動 a11y audit (focus order / aria-label / em-dash convention /
 *   44x44 tap target) が mock-timesheet 部分だけ別 selector 経路で書く必要がある。
 *
 * 修正 (src/components/mock-timesheet/mock-login-form.tsx, 2 line + 8 line comment):
 *   - form に `data-testid="mock-login-form"` 付与 (mock-submit-form と pair)
 *   - Button に `data-testid="mock-login-submit"` 付与 (login-form の login-submit と pair)
 *   - 既存 id="tsLoginSubmit" は legacy 経路として残置 (古い test との互換維持)
 *   - aria-label / className / type / id 既存属性は不変、shadcn 編集なし、機能追加なし
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-login-testid-iter1717.ts
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
  const mockSubmitForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')

  // --- 1. mock-login-form の form に data-testid="mock-login-form" 付与 ---
  if (!mockLoginForm.includes('data-testid="mock-login-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx form に data-testid="mock-login-form" が無い',
    })
  }

  // --- 2. mock-login-form の Button に data-testid="mock-login-submit" 付与 ---
  if (!mockLoginForm.includes('data-testid="mock-login-submit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx Button に data-testid="mock-login-submit" が無い',
    })
  }

  // --- 3. 既存 id="tsLoginSubmit" は維持 (legacy 経路、後方互換) ---
  if (!mockLoginForm.includes('id="tsLoginSubmit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx 既存 id="tsLoginSubmit" が消えている (legacy 互換)',
    })
  }

  // --- 4. aria-label / em-dash convention 不変 ---
  if (
    !mockLoginForm.includes("'ログイン — mock-timesheet email + password で認証'") ||
    !mockLoginForm.includes("'認証中… — mock-timesheet 認証処理を実行中'")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form.tsx Button aria-label em-dash convention が変化している',
    })
  }

  // --- 5. mock-submit-form 既存 `data-testid="mock-submit-form"` 不変 (回帰 guard) ---
  if (!mockSubmitForm.includes('data-testid="mock-submit-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx の data-testid="mock-submit-form" が消えている (sibling 回帰)',
    })
  }

  // --- 6. login-form 既存 `data-testid="login-submit"` 不変 (回帰 guard) ---
  if (!loginForm.includes('data-testid="login-submit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx の data-testid="login-submit" が消えている (sibling 回帰)',
    })
  }

  // --- 7. iter1716 reference invariant: offline 復帰アクション data-testid 維持 ---
  const offlinePage = readFileSync(resolve(here, '../src/app/~offline/page.tsx'), 'utf8')
  const retryButton = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')
  if (
    !offlinePage.includes('data-testid="offline-home-link"') ||
    !retryButton.includes('data-testid="offline-retry-button"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1716 offline page 復帰アクション data-testid 2 個のいずれかが消えている',
    })
  }

  // --- 8. iter1715 reference invariant: login-form login-*-error id 維持 ---
  if (
    !loginForm.includes('id="login-email-error"') ||
    !loginForm.includes('id="login-password-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1715 login-form の login-*-error id が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-login-form に data-testid 2 個 (form + submit) 付与済、sibling form 群 / iter1716 / iter1715 invariant 不変',
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
