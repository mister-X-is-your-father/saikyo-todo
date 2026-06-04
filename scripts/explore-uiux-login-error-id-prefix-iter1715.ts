/**
 * Phase 6.15 loop iter1715: login-form の email-error / password-error の id prefix を
 * signup-form convention (signup-*-error) と揃え `login-` prefix で統一。
 *
 * 発見した internal divergence:
 *   - login-form は hint id を `login-email-hint` / `login-password-hint` で prefix 統一済
 *   - 一方、error id は無 prefix `email-error` / `password-error` で hint と divergent
 *   - signup-form は `signup-email-hint` / `signup-email-error` 等で hint/error 両方とも prefix 統一
 *   - login-form だけ hint/error の prefix convention が不揃い (= future modal embedding 時に
 *     id collision のリスク + signup-form と命名 pattern が divergent)
 *
 * 影響: 単独 page では衝突しないが、将来 login-form を modal/popover 内に埋め込む際、
 *   近傍 component が `id="email-error"` (例: 別 form の汎用 error 表示) を持つと衝突。
 *   defensive な id namespacing で予防。
 *
 * 修正 (src/components/auth/login-form.tsx, 4 line + 8 line comment):
 *   - `id="email-error"` → `id="login-email-error"`
 *   - `id="password-error"` → `id="login-password-error"`
 *   - aria-describedby `'login-email-hint email-error'` → `'login-email-hint login-email-error'`
 *   - aria-describedby `'login-password-hint password-error'` → `'login-password-hint login-password-error'`
 *
 * 副次更新: iter737 / iter741 codify scripts の aria-describedby regex を新 id に追従。
 *
 * 実行: pnpm tsx scripts/explore-uiux-login-error-id-prefix-iter1715.ts
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

  // --- 1. login-form に新 id="login-email-error" が存在 ---
  if (!loginForm.includes('id="login-email-error"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx に id="login-email-error" が無い',
    })
  }

  // --- 2. login-form に新 id="login-password-error" が存在 ---
  if (!loginForm.includes('id="login-password-error"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx に id="login-password-error" が無い',
    })
  }

  // --- 3. login-form aria-describedby が新 ref 文字列に揃っている ---
  if (!loginForm.includes("'login-email-hint login-email-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx aria-describedby email path が新 ref に未追従',
    })
  }
  if (!loginForm.includes("'login-password-hint login-password-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx aria-describedby password path が新 ref に未追従',
    })
  }

  // --- 4. 旧 bare id は撤去済 (substring match に注意) ---
  // 旧 `'login-email-hint email-error'` の "email-error" 部分のみ残らないか確認。
  // 新 id "login-email-error" 自体に "email-error" substring を含むので、aria-describedby
  // 文字列単位で旧 path を厳密チェック。
  if (loginForm.includes("'login-email-hint email-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form.tsx に旧 aria-describedby path "login-email-hint email-error" が残存',
    })
  }
  if (loginForm.includes("'login-password-hint password-error'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        'login-form.tsx に旧 aria-describedby path "login-password-hint password-error" が残存',
    })
  }

  // --- 5. signup-form 既存 prefix 統一 invariant (回帰 guard) ---
  if (
    !signupForm.includes('id="signup-email-error"') ||
    !signupForm.includes('id="signup-password-error"')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form.tsx の signup-email-error / signup-password-error id が消えている',
    })
  }

  // --- 6. iter1715 説明 comment が login-form に残っている ---
  const iter1715CommentCount = (loginForm.match(/iter1715:/g) ?? []).length
  if (iter1715CommentCount < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `login-form.tsx の iter1715 comment が ${iter1715CommentCount} 件 < 2 (email + password の 2 箇所)`,
    })
  }

  // --- 7. iter1714 reference invariant: signup login-link data-testid 維持 ---
  const signupPage = readFileSync(resolve(here, '../src/app/(auth)/signup/page.tsx'), 'utf8')
  if (!signupPage.includes('data-testid="login-link"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1714 signup/page.tsx login-link data-testid が消えている (regression)',
    })
  }

  // --- 8. iter1713 reference invariant: item-summary-panel aria-atomic 維持 ---
  const itemSummaryPanel = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  const ariaAtomicCount = (itemSummaryPanel.match(/aria-atomic="true"/g) ?? []).length
  if (ariaAtomicCount < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1713 item-summary-panel.tsx の aria-atomic="true" 件数が ${ariaAtomicCount} < 3 (regression)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — login-form の email-error / password-error id が `login-` prefix で signup-form convention と統一、iter1714 / iter1713 invariant 不変',
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
