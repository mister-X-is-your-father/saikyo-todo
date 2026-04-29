/**
 * Phase 6.15 loop iter 359 — login / signup form に CardDescription を
 * `aria-describedby` で programmatic に紐付け。SR ユーザが form に focus した
 * 直後に welcome / instruction 文 (例 "最強TODO へようこそ" /
 * "アカウントを作成して始めましょう") を読み上げ、文脈を提供する。
 *
 * 課題: 旧実装では `<form aria-labelledby="login-heading">` のみで
 *   CardDescription "最強TODO へようこそ" は隣接 div として独立、SR は form
 *   focus 時に welcome 文を announce しない。signup も同様で
 *   CardDescription "アカウントを作成して始めましょう" が programmatic に form
 *   と紐付かなかった。
 *
 * fix: `(auth)/login/page.tsx` / `(auth)/signup/page.tsx` の CardDescription に
 *   `id="login-description"` / `id="signup-description"` を付与し、対応する
 *   `login-form.tsx` / `signup-form.tsx` の form に `aria-describedby="<id>"`
 *   を追加 (4 file × 1 line = 計 4 行)。aria-labelledby (heading) +
 *   aria-describedby (description) の標準的 form labelling 二段構成に揃える。
 *
 * 機能追加なし、shadcn 編集なし、影響面 4 ファイル (page + form pair × 2)。
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
      mustContain: /<CardDescription id="login-description">/,
      label: 'login page CardDescription id',
    },
    {
      file: 'src/components/auth/login-form.tsx',
      mustContain: /aria-describedby="login-description"/,
      label: 'login form aria-describedby',
    },
    {
      file: 'src/app/(auth)/signup/page.tsx',
      mustContain: /<CardDescription id="signup-description">/,
      label: 'signup page CardDescription id',
    },
    {
      file: 'src/components/auth/signup-form.tsx',
      mustContain: /aria-describedby="signup-description"/,
      label: 'signup form aria-describedby',
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

  // iter256 の aria-labelledby 二段は維持されていること
  const loginForm = readFileSync(
    resolve(process.cwd(), 'src/components/auth/login-form.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="login-heading"/.test(loginForm)) {
    findings.push({
      level: 'warning',
      message: 'login-form: aria-labelledby が消えた (regression)',
    })
  }
  const signupForm = readFileSync(
    resolve(process.cwd(), 'src/components/auth/signup-form.tsx'),
    'utf8',
  )
  if (!/aria-labelledby="signup-heading"/.test(signupForm)) {
    findings.push({
      level: 'warning',
      message: 'signup-form: aria-labelledby が消えた (regression)',
    })
  }

  console.log(`\n=== Findings (auth-form-describedby-iter359) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
