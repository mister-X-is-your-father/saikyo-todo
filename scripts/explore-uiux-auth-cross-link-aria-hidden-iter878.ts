/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y) —
 * auth pages (login / signup) の cross-link visible text を <span aria-hidden="true">
 * で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-877 sweep の続編。auth 2 page の card footer 内 cross-link
 *   (login → signup / signup → login) は aria-label に長い完全 content
 *   (「アカウントをお持ちでない方はこちらでサインアップ」 / 「既にアカウントをお持ちの方はこちらでログイン」)
 *   を持つが、visible text "サインアップ" / "ログイン" は aria-hidden 無し → SR 二重読み上げ。
 *
 * 修正: 2 link visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-877 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const login = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  const signup = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')

  // 1. login → signup link visible aria-hidden
  if (/<span aria-hidden="true">サインアップ<\/span>/.test(login)) {
    findings.push({
      level: 'info',
      message: `login page → signup link visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `login page → signup link visible aria-hidden 未統合`,
    })
  }

  // 2. signup → login link visible aria-hidden
  if (/<span aria-hidden="true">ログイン<\/span>/.test(signup)) {
    findings.push({
      level: 'info',
      message: `signup page → login link visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup page → login link visible aria-hidden 未統合`,
    })
  }

  // 3. aria-label 維持
  if (
    /aria-label="アカウントをお持ちでない方はこちらでサインアップ"/.test(login) &&
    /aria-label="既にアカウントをお持ちの方はこちらでログイン"/.test(signup)
  ) {
    findings.push({
      level: 'info',
      message: `auth pages cross-link aria-label 完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `auth pages cross-link aria-label 破壊`,
    })
  }

  // 4. data-testid + Link href 維持
  if (
    /data-testid="signup-link"/.test(login) &&
    /href="\/signup"/.test(login) &&
    /href="\/login"/.test(signup)
  ) {
    findings.push({
      level: 'info',
      message: `auth pages cross-link href + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `auth pages cross-link href / data-testid 破壊`,
    })
  }

  // iter844 invariant: login form submit aria-hidden
  const loginForm = readFileSync(
    resolve(process.cwd(), 'src/components/auth/login-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(loginForm)
  ) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter845 invariant: signup form submit aria-hidden
  const signupForm = readFileSync(
    resolve(process.cwd(), 'src/components/auth/signup-form.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{isPending \? '作成中…' : 'サインアップ'\}<\/span>/.test(signupForm)
  ) {
    findings.push({
      level: 'info',
      message: `iter845 invariant: signup form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter845 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (auth-cross-link-aria-hidden-iter878) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
