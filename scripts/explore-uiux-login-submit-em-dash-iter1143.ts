/**
 * Phase 6.15 loop iter1143: login-form submit aria-label em-dash convention regression guard。
 *
 * iter1143 で発見した divergence: signup-form (iter1093) は visible-prefix em-dash convention
 * '<visible> — <descriptive>' に統一済だが、login-form は旧 paren convention
 * '<visible> (<descriptive>)' のままで convention が divergence していた。
 * 視覚的・WCAG 2.5.3 substring 自体は () でも prefix 一致するため OK だが、style 統一
 * (iter1093-1124 sweep 集合) と alignment した方が読みやすい / grep しやすい。
 *
 * 修正 (login-form.tsx): 2 path em-dash 統一
 *   - default: 'ログイン — メール + パスワードで認証'
 *   - pending: 'ログイン中… — 認証処理を実行中'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-login-submit-em-dash-iter1143.ts
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
  const filePath = resolve(here, '../src/components/auth/login-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'ログイン — メール + パスワードで認証'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form default aria-label が em-dash 形式 "ログイン — ..." でない',
    })
  }
  if (!src.includes("'ログイン中… — 認証処理を実行中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'login-form pending aria-label が em-dash 形式 "ログイン中… — ..." でない',
    })
  }
  if (src.includes("'ログイン (メール + パスワードで認証)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren aria-label "ログイン (メール + パスワードで認証)" が残存',
    })
  }
  if (src.includes("'ログイン中… (認証処理を実行中)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren aria-label "ログイン中… (認証処理を実行中)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — login-form submit aria-label は signup-form と同 em-dash convention で統一済',
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
