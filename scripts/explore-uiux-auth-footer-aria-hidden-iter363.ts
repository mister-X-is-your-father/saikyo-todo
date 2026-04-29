/**
 * Phase 6.15 loop iter 363 — login / signup CardFooter の question span
 * (login: "アカウント未作成?" / signup: "アカウントあり?") に
 * `aria-hidden="true"` を付与し SR 重複読み上げを除去。
 *
 * 課題: 旧実装では question span (visual の framing) と隣接 <Link> の
 *   aria-label ("アカウントをお持ちでない方はこちらでサインアップ" /
 *   "既にアカウントをお持ちの方はこちらでログイン") が同じ context を
 *   別表現で 2 回 announce、SR ユーザは "アカウント未作成?" → "アカウント
 *   をお持ちでない方はこちらでサインアップ link" の冗長読み上げになる。
 *   Link の aria-label が question 内容を完全に内包しているため question
 *   span は SR にとって noise。
 *
 * fix: question span に `aria-hidden="true"` を付与 (2 file × 1 attr 追加)。
 *   visual UI は変化なし (sighted user は question を引き続き視認)、SR は
 *   span を skip して Link の包括的 aria-label のみを announce。WCAG
 *   SC 1.3.1 (Info and Relationships) は Link の aria-label で programmatic
 *   に保たれる、SC 2.5.3 (Label in Name) も visible "サインアップ" /
 *   "ログイン" が aria-label に内包される pattern を維持。
 *
 * 機能追加なし、shadcn 編集なし、影響面 2 ファイル (login/page + signup/page)。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cases = [
    {
      file: 'src/app/(auth)/login/page.tsx',
      mustContain: /<span aria-hidden="true"[\s\S]+?アカウント未作成/,
      label: 'login question span aria-hidden',
    },
    {
      file: 'src/app/(auth)/signup/page.tsx',
      mustContain: /<span aria-hidden="true"[\s\S]+?アカウントあり/,
      label: 'signup question span aria-hidden',
    },
  ]

  for (const c of cases) {
    const src = readFileSync(resolve(process.cwd(), c.file), 'utf8')
    if (!c.mustContain.test(src)) {
      findings.push({ level: 'warning', message: `${c.file}: ${c.label} 不在` })
    } else {
      findings.push({ level: 'info', message: `${c.file}: ${c.label} OK` })
    }
  }

  // Link の aria-label invariant 維持 (question 内容を内包していること)
  const loginPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')
  if (!/aria-label="アカウントをお持ちでない方はこちらでサインアップ"/.test(loginPage)) {
    findings.push({
      level: 'warning',
      message: 'login: signup-link aria-label が消えた (regression)',
    })
  }
  const signupPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/signup/page.tsx'), 'utf8')
  if (!/aria-label="既にアカウントをお持ちの方はこちらでログイン"/.test(signupPage)) {
    findings.push({
      level: 'warning',
      message: 'signup: login-link aria-label が消えた (regression)',
    })
  }

  console.log(`\n=== Findings (auth-footer-aria-hidden-iter363) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
