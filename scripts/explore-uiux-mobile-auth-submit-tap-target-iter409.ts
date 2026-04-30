/**
 * Phase 6.15 loop iter 409 (mode-M Mobile audit) — /login + /signup form
 * 主要 submit button を 44px tall に拡大 (iter408 pattern を auth form に
 * 水平展開、WCAG 2.5.5 AAA + Apple HIG 44pt)。
 *
 * 課題: src/components/auth/login-form.tsx + signup-form.tsx の <Button
 *   type="submit" className="w-full"> は shadcn Button default size
 *   (h-8 = 32px) を継承し mobile で tap target 32px。WCAG 2.5.5 違反。
 *   /login + /signup は app の最 critical path (= 認証通らないと何もできない)、
 *   submit ミスタップは UX 致命的。
 *
 *   Mobile audit measure (320x568 iPhone SE):
 *   - login submit "ログイン" button: 256x32 → 44 違反
 *   - signup submit "サインアップ" button: 256x32 → 44 違反
 *
 *   ユーザ要望「スマホ表示が全体的にいけてない」(2026-04-30) の消化として
 *   auth form は最 visit 高度で優先度高、iter408 (/~offline recovery) に
 *   続く 2 弾目。
 *
 * fix: 2 file × 各 1 line 差替 (className="w-full" → className="h-11 w-full")。
 *   - login-form.tsx: <Button type="submit" className="h-11 w-full">
 *   - signup-form.tsx: <Button type="submit" className="h-11 w-full">
 *
 *   結果: 両 button 256x44 (verified by MCP browser_evaluate, pass44h=true)。
 *   既存の iter255 pending aria-label / iter273 disabled 維持、shadcn Button
 *   の cn() merge で h-8 → h-11 に正常 dedupe。w-full 維持で full-width
 *   primary action design。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。desktop でも 44px
 * primary submit は overpower でなく適切 (workspace 内の sm size button
 * と区別され、auth form の primary action が視覚的に強調される副次効果)。
 *
 * 検証: source-side regex assert + screenshot 比較
 *   (.playwright-mcp/uiux-mobile-{login,signup}-iter409-after.png) で
 *   修正前後の視覚を確認 + MCP で pass44h=true を直接 measure。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPath = 'src/components/auth/login-form.tsx'
  const signupPath = 'src/components/auth/signup-form.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const signupSrc = readFileSync(resolve(process.cwd(), signupPath), 'utf8')

  // 1. login-form submit Button has h-11 w-full
  const loginSubmit = loginSrc.match(/<Button[\s\S]*?type="submit"[\s\S]*?\/>/) ||
    loginSrc.match(/<Button[\s\S]*?type="submit"[\s\S]*?<\/Button>/)
  if (!loginSubmit) {
    findings.push({ level: 'warning', message: `${loginPath}: submit Button が見つからない` })
  } else if (!/className="h-11 w-full"/.test(loginSubmit[0])) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: submit Button に className="h-11 w-full" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${loginPath}: h-11 w-full OK` })
  }

  // 2. signup-form submit Button has h-11 w-full
  const signupSubmit = signupSrc.match(/<Button[\s\S]*?type="submit"[\s\S]*?\/>/) ||
    signupSrc.match(/<Button[\s\S]*?type="submit"[\s\S]*?<\/Button>/)
  if (!signupSubmit) {
    findings.push({ level: 'warning', message: `${signupPath}: submit Button が見つからない` })
  } else if (!/className="h-11 w-full"/.test(signupSubmit[0])) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: submit Button に className="h-11 w-full" が無い`,
    })
  } else {
    findings.push({ level: 'info', message: `${signupPath}: h-11 w-full OK` })
  }

  // iter255 invariant 維持: pending aria-label
  if (!/aria-label=\{isPending \? 'ログイン中… \(認証処理を実行中\)' : undefined\}/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter255 pending aria-label が消えた (regression)`,
    })
  }
  if (
    !/aria-label=\{isPending \? 'アカウント作成中…' : 'アカウントを作成 \(サインアップ\)'\}/.test(
      signupSrc,
    )
  ) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: iter255 pending aria-label が消えた (regression)`,
    })
  }

  // iter408 invariant 維持: /~offline buttons h-11 px-4
  const offlineRetryPath = 'src/app/~offline/retry-button.tsx'
  const offlineRetrySrc = readFileSync(resolve(process.cwd(), offlineRetryPath), 'utf8')
  if (!/className="h-11 px-4"/.test(offlineRetrySrc)) {
    findings.push({
      level: 'warning',
      message: `${offlineRetryPath}: iter408 h-11 が消えた (regression)`,
    })
  }

  // iter401 invariant 維持: enterKeyHint pattern
  if (!/enterKeyHint="next"/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter401 enterKeyHint="next" が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (mobile-auth-submit-tap-target-iter409) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
