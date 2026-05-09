/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y) —
 * signup page footer login-link visible "ログイン" を aria-hidden span で wrap。
 *
 * 課題: src/app/(auth)/signup/page.tsx の footer login-link `<Link>` は
 *   aria-label="既にアカウントをお持ちの方はこちらでログイン" が完全 content
 *   を含むのに visible "ログイン" は aria-hidden 無し。SR は visible +
 *   aria-label の 2 経路で読み上げ重複 (iter851 login → signup と対称)。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">ログイン</span> で wrap、aria-label 単独経路。
 *
 * 検証: source-side regex assert + iter844 / iter849 / iter850 / iter851
 *   invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const signupPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')

  if (
    /aria-label="既にアカウントをお持ちの方はこちらでログイン"[\s\S]*?<span aria-hidden="true">ログイン<\/span>/.test(
      signupPage,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter852: signup page login-link visible "ログイン" を aria-hidden span で wrap OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter852: signup page login-link visible aria-hidden 不完全`,
    })
  }

  if (
    /aria-label="既にアカウントをお持ちの方はこちらでログイン"/.test(signupPage) &&
    /href="\/login"/.test(signupPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: signup page login-link aria-label + href 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter852 invariant: signup page login-link 属性破壊`,
    })
  }

  // iter851 invariant: login page signup-link aria-hidden
  const loginPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (
    /data-testid="signup-link"[\s\S]*?<span aria-hidden="true">サインアップ<\/span>/.test(loginPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: login page signup-link aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today button aria-hidden
  const calendarView = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(calendarView)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view today button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter850 invariant: item-edit-dialog aria-hidden span >=6
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const ahCount = (ied.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount >= 6) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (>=6) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (<6) 破壊`,
    })
  }

  console.log(`\n=== Findings (signup-login-link-aria-hidden-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
