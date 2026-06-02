/**
 * Phase 6.15 loop iter1689: (auth) layout の <main> landmark 名を
 * static `aria-label="認証 — ログイン / サインアップ"` (両 page 同一で SR 用 landmark
 * navigation で現在 page を区別不能) から `aria-labelledby="signup-heading login-heading"`
 * へ変更。aria-labelledby は missing ID を silently skip (WAI-ARIA 1.2 §5.2.6.7) するため
 * /signup では `サインアップ`、/login では `ログイン` と現在 page の見出しが
 * landmark 名として読まれる (mock-timesheet `aria-labelledby` pattern と統一)。
 *
 * 実行: pnpm tsx scripts/explore-uiux-auth-main-labelledby-iter1689.ts
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

  const layout = readFileSync(resolve(here, '../src/app/(auth)/layout.tsx'), 'utf8')

  if (layout.includes('aria-label="認証')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '(auth) layout に static aria-label="認証..." 残存 (両 page 同一で landmark 区別不能)',
    })
  }

  if (!layout.includes('aria-labelledby="signup-heading login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '(auth) layout に aria-labelledby="signup-heading login-heading" が無い',
    })
  }

  // 各 page で referenced ID が存在することを invariant 確認
  const signupPage = readFileSync(resolve(here, '../src/app/(auth)/signup/page.tsx'), 'utf8')
  const loginPage = readFileSync(resolve(here, '../src/app/(auth)/login/page.tsx'), 'utf8')

  if (!signupPage.includes('id="signup-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup/page.tsx に id="signup-heading" の <h1> が無い (landmark 名 broken)',
    })
  }
  if (!loginPage.includes('id="login-heading"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login/page.tsx に id="login-heading" の <h1> が無い (landmark 名 broken)',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — (auth) main landmark は aria-labelledby で current page heading を参照')
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
