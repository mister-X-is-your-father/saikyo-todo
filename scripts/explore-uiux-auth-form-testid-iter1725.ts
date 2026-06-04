/**
 * Phase 6.15 loop iter1725: login-form + signup-form の form-level data-testid 付与。
 * iter1717 mock-login-form pattern (form + button pair) を auth form 2 個にも適用、
 * auth flow 全体で `[data-testid$="-form"]` / `[data-testid$="-submit"]` の 2 pattern で
 * 全 form / 全 submit button 一括発見可能に。
 *
 * 発見した asymmetry:
 *   - login-form: Button `data-testid="login-submit"` を持つが form-level data-testid 無し
 *   - signup-form: Button `data-testid="signup-submit"` を持つが form-level data-testid 無し
 *   - mock-login-form (iter1717): form `data-testid="mock-login-form"` + button `mock-login-submit`
 *   - mock-submit-form: form `data-testid="mock-submit-form"`
 *   - auth flow form 群 (login/signup) だけ form-level data-testid 欠落で divergent
 *
 * 修正 (src/components/auth/login-form.tsx + signup-form.tsx, 2 line + 5 line comment ずつ):
 *   - login-form: form に `data-testid="login-form"` 付与
 *   - signup-form: form に `data-testid="signup-form"` 付与
 *   - 既存 aria-labelledby / aria-describedby / aria-busy / noValidate / className 不変
 *   - Button の既存 data-testid (login-submit / signup-submit) も不変
 *   - shadcn 編集なし、機能追加なし
 *
 * 効果: Playwright pattern:
 *   - `[data-testid$="-form"]` → login-form / signup-form / mock-login-form / mock-submit-form
 *     の 4 form 一括発見
 *   - `[data-testid$="-submit"]` → login-submit / signup-submit / mock-login-submit /
 *     tsSubmit (mock-submit-form は id="tsSubmit" 経路 legacy、別途 audit 候補)
 *
 * 実行: pnpm tsx scripts/explore-uiux-auth-form-testid-iter1725.ts
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

  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
  const signupForm = readFileSync(resolve(here, '../src/components/auth/signup-form.tsx'), 'utf8')
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const mockSubmitForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // --- 1. login-form に data-testid="login-form" 付与済 ---
  if (!loginForm.includes('data-testid="login-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx form に data-testid="login-form" が無い',
    })
  }

  // --- 2. signup-form に data-testid="signup-form" 付与済 ---
  if (!signupForm.includes('data-testid="signup-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx form に data-testid="signup-form" が無い',
    })
  }

  // --- 3. login-form Button 既存 data-testid="login-submit" 不変 ---
  if (!loginForm.includes('data-testid="login-submit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx Button の data-testid="login-submit" が消えている',
    })
  }

  // --- 4. signup-form Button 既存 data-testid="signup-submit" 不変 ---
  if (!signupForm.includes('data-testid="signup-submit"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx Button の data-testid="signup-submit" が消えている',
    })
  }

  // --- 5. mock-login-form 既存 data-testid 2 個 (iter1717) 不変 ---
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

  // --- 6. mock-submit-form 既存 data-testid (sibling 回帰 guard) 不変 ---
  if (!mockSubmitForm.includes('data-testid="mock-submit-form"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-submit-form.tsx の data-testid="mock-submit-form" が消えている',
    })
  }

  // --- 7. iter1724 reference invariant: home page logout em-dash 維持 ---
  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!homePage.includes('aria-label="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1724 home page logout aria-label em-dash が消えている',
    })
  }

  // --- 8. iter1723 reference invariant: signup-displayName-* id 維持 ---
  if (
    !signupForm.includes('id="signup-displayName-hint"') ||
    !signupForm.includes('id="signup-displayName-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1723 signup-form signup-displayName-* id が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — login-form + signup-form に form-level data-testid 付与済、auth flow 全体で [data-testid$="-form"] / [data-testid$="-submit"] discover 可能、iter1717 / iter1724 / iter1723 invariant 不変',
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
