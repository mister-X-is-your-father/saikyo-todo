/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * mock-timesheet login form submit button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/mock-timesheet/mock-login-form.tsx 行 96-109 の submit
 *   button は aria-label "認証中… (mock-timesheet 認証処理を実行中)" /
 *   "ログイン (mock-timesheet email + password で認証)" が完全 content を含むのに
 *   visible "認証中.../ログイン" は aria-hidden 無し → SR 2 経路読み上げ重複。
 *   iter844 (主 login form) と対称な mock 環境 fix。iter844-868 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{isPending ? '認証中...' : 'ログイン'}</span>
 *
 * 検証: source-side regex assert + iter844 (login submit) / iter845 (signup submit)
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

  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )

  if (/<span aria-hidden="true">\{isPending \? '認証中\.\.\.' : 'ログイン'\}<\/span>/.test(mlf)) {
    findings.push({
      level: 'info',
      message: `iter869: mock-timesheet login submit button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter869: mock-timesheet login submit button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / id 維持
  if (
    /aria-label=\{[\s\S]*?'ログイン \(mock-timesheet email \+ password で認証\)'/.test(mlf) &&
    /id="tsLoginSubmit"/.test(mlf) &&
    /type="submit"/.test(mlf)
  ) {
    findings.push({
      level: 'info',
      message: `iter869 invariant: mock-timesheet login submit aria-label / id 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter869 invariant: 破壊` })
  }

  // iter868 invariant: sprint status 遷移 4 button aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">稼働開始<\/span>/.test(sp) &&
    /<span aria-hidden="true">中止<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: sprints status 遷移 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-login-submit-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
