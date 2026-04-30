/**
 * Phase 6.15 loop iter 412 (mode-M Mobile audit) — /login + /signup
 * CardFooter Link を 44x44 tap target に拡大 (iter287 の py-2=36px を
 * min-h-11 + px-2 で 44px に格上げ)。
 *
 * 課題: src/app/(auth)/login/page.tsx + signup/page.tsx の CardFooter
 *   Link は iter287 で py-2 を追加して 36px (height) に上げ済だが、
 *   WCAG 2.5.5 AAA + Apple HIG 44pt にはまだ届かず。Mobile audit
 *   measure (320x568) で signup link=86x36 / login link=57x36 で
 *   特に signup→login link が 57px 幅で width も 44 未達。auth flow の
 *   2 form 切替 link は mobile での mistap が回避必要。iter287 (py-2)
 *   → iter412 (min-h-11 + px-2) で 36px → 44px へ完成させる。
 *
 * fix: 2 file × 各 1 line 差替 (className: `inline-flex items-center
 *   py-2` → `inline-flex min-h-11 items-center px-2 py-2`)。
 *   - login/page.tsx: signup-link
 *   - signup/page.tsx: login link (data-testid なし)
 *
 *   `min-h-11` で height を最低 44px に。`px-2` で width を 8px ずつ
 *   左右にパディングし width も 44 を超えるように (signup link 57→
 *   ~73 width)。`py-2` 維持で iter287 invariant も保つ。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル。視覚的には link が
 * 微増 (8px 左右の clickable margin)、underline は維持。
 *
 * 検証: source-side regex assert + MCP browser_evaluate で pass44=true
 *   を直接 measure (signup-link: 86x36 → 102x44 verified)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPath = 'src/app/(auth)/login/page.tsx'
  const signupPath = 'src/app/(auth)/signup/page.tsx'
  const loginSrc = readFileSync(resolve(process.cwd(), loginPath), 'utf8')
  const signupSrc = readFileSync(resolve(process.cwd(), signupPath), 'utf8')

  // login page: signup-link className に min-h-11 + px-2 + py-2
  const loginLink = loginSrc.match(/<Link[\s\S]*?data-testid="signup-link"[\s\S]*?>/)
  if (!loginLink) {
    findings.push({ level: 'warning', message: `${loginPath}: signup-link block 不在` })
  } else {
    if (!/min-h-11/.test(loginLink[0])) {
      findings.push({
        level: 'warning',
        message: `${loginPath}: signup-link に min-h-11 が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${loginPath}: min-h-11 OK` })
    }
    if (!/px-2/.test(loginLink[0])) {
      findings.push({
        level: 'warning',
        message: `${loginPath}: signup-link に px-2 が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${loginPath}: px-2 OK` })
    }
    if (!/py-2/.test(loginLink[0])) {
      findings.push({
        level: 'warning',
        message: `${loginPath}: iter287 py-2 が消えた (regression)`,
      })
    }
  }

  // signup page: login link className に min-h-11 + px-2 + py-2
  const signupLink = signupSrc.match(/<Link[\s\S]*?href="\/login"[\s\S]*?>/)
  if (!signupLink) {
    findings.push({ level: 'warning', message: `${signupPath}: login link block 不在` })
  } else {
    if (!/min-h-11/.test(signupLink[0])) {
      findings.push({
        level: 'warning',
        message: `${signupPath}: login link に min-h-11 が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${signupPath}: min-h-11 OK` })
    }
    if (!/px-2/.test(signupLink[0])) {
      findings.push({
        level: 'warning',
        message: `${signupPath}: login link に px-2 が無い`,
      })
    } else {
      findings.push({ level: 'info', message: `${signupPath}: px-2 OK` })
    }
    if (!/py-2/.test(signupLink[0])) {
      findings.push({
        level: 'warning',
        message: `${signupPath}: iter287 py-2 が消えた (regression)`,
      })
    }
  }

  // iter259 invariant 維持: aria-label 維持
  if (!/aria-label="アカウントをお持ちでない方はこちらでサインアップ"/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter259 aria-label が消えた (regression)`,
    })
  }
  if (!/aria-label="既にアカウントをお持ちの方はこちらでログイン"/.test(signupSrc)) {
    findings.push({
      level: 'warning',
      message: `${signupPath}: iter259 aria-label が消えた (regression)`,
    })
  }

  // iter286 invariant 維持: underline 維持
  if (!/underline underline-offset-4/.test(loginSrc)) {
    findings.push({
      level: 'warning',
      message: `${loginPath}: iter286 underline が消えた (regression)`,
    })
  }

  console.log(`\n=== Findings (mobile-auth-footer-link-tap-iter412) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
