/**
 * Phase 6.15 loop iter1718: mock-top-nav logout form aria-label の子 Button との
 * 完全同一 (= SR 重複読み上げ redundancy) を解消、form は landmark/group descriptor
 * brief 名 "ログアウト操作" に分け button は詳細 aria-label 維持。
 *
 * 発見した重複:
 *   - form aria-label="ログアウト — mock-timesheet session を終了" (line 45 旧)
 *   - button aria-label="ログアウト — mock-timesheet session を終了" (line 54)
 *   → SR landmark/rotor 経路で「ログアウト — ...」 を form (forms-list / landmark) と
 *     button (button-tab) で 2 回連続聞かされる redundancy
 *
 * 影響: form は role landmark / "forms" rotor 経路で発見されるが、子 button への Tab で
 *   同じ aria-label を再 announce、SR 利用者の navigation 速度低下 + 認知負荷上昇。
 *
 * 修正 (src/components/mock-timesheet/mock-top-nav.tsx, 1 line + 7 line comment):
 *   form aria-label を `"ログアウト操作"` (brief group descriptor) に変更。
 *   button aria-label `"ログアウト — mock-timesheet session を終了"` は不変。
 *   visible "ログアウト" span / className / type / action は完全不変。
 *
 *   SR navigation:
 *     - landmark/rotor 経路 → "ログアウト操作, form" (brief)
 *     - Tab/button 経路 → "ログアウト — mock-timesheet session を終了, button" (詳細)
 *   2 段階 information で SR 利用者は概要 → 詳細を progressive に理解可能。
 *
 * codebase convention align:
 *   - login-form: form `aria-labelledby="login-heading"` (= "ログイン") + button
 *     aria-label "ログイン — メール + パスワードで認証" → 異 text、divergent な convention
 *   - mock-login-form: form `aria-label="Mock Timesheet ログインフォーム"` + button
 *     aria-label "ログイン — mock-timesheet email + password で認証" → 異 text、divergent
 *   - mock-top-nav logout (旧): form と button が完全同一 → divergent でない (= 例外)
 *   - mock-top-nav logout (新 iter1718): form "ログアウト操作" + button "ログアウト — ..."
 *     → 全 form/button が divergent convention に揃う
 *
 * 実行: pnpm tsx scripts/explore-uiux-mock-logout-form-deredundant-iter1718.ts
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

  // --- 1. form の新 aria-label="ログアウト操作" 存在 ---
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx の form aria-label="ログアウト操作" が無い',
    })
  }

  // --- 2. 旧 form aria-label (button と同一) は撤去済 ---
  //   form (line 45) と button (line 54) で aria-label が同一だった旧 state を検出するため、
  //   string `aria-label="ログアウト — mock-timesheet session を終了"` が 2 回 (= form + button)
  //   出現しないことを確認。1 回 (= button のみ) なら OK。
  const detailedAriaLabelCount = (
    mockTopNav.match(/aria-label="ログアウト — mock-timesheet session を終了"/g) ?? []
  ).length
  if (detailedAriaLabelCount !== 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `mock-top-nav.tsx の詳細 aria-label "ログアウト — ..." の出現回数が ${detailedAriaLabelCount} (期待 1: form は brief 名、button のみ詳細)`,
    })
  }

  // --- 3. 子 Button の詳細 aria-label は維持 (= button level での voice control / SR は不変) ---
  if (!mockTopNav.includes('aria-label="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx Button の詳細 aria-label が消えている',
    })
  }

  // --- 4. visible "ログアウト" span は不変 ---
  if (!mockTopNav.includes('<span aria-hidden="true">ログアウト</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav.tsx visible "ログアウト" span が消えている',
    })
  }

  // --- 5. iter1085 nav 内 aria-current="page" pattern 維持 ---
  if (!mockTopNav.includes("aria-current={isNew ? 'page' : undefined}")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1085 aria-current="page" pattern が消えている (regression)',
    })
  }

  // --- 6. iter1717 reference invariant: mock-login-form data-testid 維持 ---
  const mockLoginForm = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
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
      message: 'iter1716 offline 復帰アクション data-testid 2 個のいずれかが消えている',
    })
  }

  // --- 8. iter1715 reference invariant: login-form login-*-error id 維持 ---
  const loginForm = readFileSync(resolve(here, '../src/components/auth/login-form.tsx'), 'utf8')
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
      '(なし) — mock-top-nav logout form の SR 重複読み上げ解消 (form="ログアウト操作" brief + button="ログアウト — ..." 詳細)、iter1717 / iter1716 / iter1715 invariant 不変',
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
