/**
 * Phase 6.15 loop iter 410 (mode-M Mobile audit) — mock-timesheet 2 form
 * (mock-login-form + mock-submit-form) の submit button を 44px tall に
 * 拡大 (iter408+409 pattern を mock-timesheet に水平展開)。
 *
 * 課題: src/components/mock-timesheet/mock-login-form.tsx +
 *   mock-submit-form.tsx の <Button type="submit" className="w-full"> は
 *   shadcn default h-8 = 32px を継承し mobile で WCAG 2.5.5 違反。
 *   iter408 (/~offline) + iter409 (auth) の sweep 続編、mock-timesheet
 *   は Playwright 自動入力のテスト対象 mock 外部システム (saikyo-todo
 *   とは独立) だが、iter378-381 で a11y polish 済の系統で tap target も
 *   揃えて mobile UX 一貫性を確保。
 *
 *   Mobile audit measure (320x568 iPhone SE):
 *   - mock-login submit "ログイン" button: 256/272x32 → 44 違反
 *   - mock-submit submit "工数送信" button: 256x32 → 44 違反
 *
 * fix: 2 file × 各 1 line 差替 (className="w-full" → className="h-11 w-full")。
 *   - mock-login-form.tsx: <Button id="tsLoginSubmit" className="h-11 w-full">
 *   - mock-submit-form.tsx: <Button id="tsSubmit" className="h-11 w-full">
 *
 *   結果: 両 button 272x44 (verified by MCP browser_evaluate, pass44h=true)。
 *   既存 iter378/iter405 の aria-label / aria-busy / id 維持。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。これで iter408+409+410
 * = unauth/auth/mock-timesheet 全 5 form (login / signup / mock-login /
 * mock-submit + offline retry) の submit button が 44x44 tap target
 * 統一達成、mobile UX consistency 完備。
 *
 * 検証: source-side regex assert + MCP browser_evaluate で pass44h=true
 *   を直接 measure。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPath = 'src/components/mock-timesheet/mock-login-form.tsx'
  const submitPath = 'src/components/mock-timesheet/mock-submit-form.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const submitSrc = readFileSync(resolve(process.cwd(), submitPath), 'utf8')

  // 1. mock-login-form submit Button has h-11 w-full
  const loginSubmit = loginSrc.match(/<Button[\s\S]*?id="tsLoginSubmit"[\s\S]*?<\/Button>/)
  if (!loginSubmit) {
    findings.push({ level: 'warning', message: `${loginPath}: tsLoginSubmit Button が見つからない` })
  } else if (!/className="h-11 w-full"/.test(loginSubmit[0])) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: tsLoginSubmit に className="h-11 w-full" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${loginPath}: h-11 w-full OK` })
  }

  // 2. mock-submit-form submit Button has h-11 w-full
  const submitSubmit = submitSrc.match(/<Button[\s\S]*?id="tsSubmit"[\s\S]*?<\/Button>/)
  if (!submitSubmit) {
    findings.push({ level: 'warning', message: `${submitPath}: tsSubmit Button が見つからない` })
  } else if (!/className="h-11 w-full"/.test(submitSubmit[0])) {
    findings.push({
      level: 'warning',
      message: `${submitPath}: tsSubmit に className="h-11 w-full" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${submitPath}: h-11 w-full OK` })
  }

  // iter378/379 invariant 維持: handleSubmit(onSubmit, onInvalid) wire up
  for (const [path, src] of [
    [loginPath, loginSrc],
    [submitPath, submitSrc],
  ] as const) {
    if (!/handleSubmit\(onSubmit,\s*onInvalid\)/.test(src)) {
      findings.push({
        level: 'warning',
        message: `${path}: iter378/379 onInvalid wire up が消えた (regression)`,
      })
    }
  }

  // iter405 invariant 維持: aria-label + aria-busy
  if (!/aria-label="Mock Timesheet ログインフォーム"/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter405 form aria-label が消えた (regression)`,
    })
  }
  if (!/aria-label="Mock Timesheet 工数送信フォーム"/.test(submitSrc)) {
    findings.push({
      level: 'warning',
      message: `${submitPath}: iter405 form aria-label が消えた (regression)`,
    })
  }

  // iter408+409 invariant 維持: /~offline + auth submit h-11
  const offlineRetrySrc = readFileSync(
    resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'),
    'utf8',
  )
  if (!/className="h-11 px-4"/.test(offlineRetrySrc)) {
    findings.push({
      level: 'warning',
      message: `~offline/retry-button.tsx: iter408 h-11 px-4 が消えた (regression)`,
    })
  }
  const authLoginSrc = readFileSync(
    resolve(process.cwd(), 'src/components/auth/login-form.tsx'),
    'utf8',
  )
  if (!/className="h-11 w-full"/.test(authLoginSrc)) {
    findings.push({
      level: 'warning',
      message: `auth/login-form.tsx: iter409 h-11 w-full が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (mobile-mock-submit-tap-target-iter410) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
