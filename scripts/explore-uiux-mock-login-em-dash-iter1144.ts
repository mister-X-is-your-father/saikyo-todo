/**
 * Phase 6.15 loop iter1144: mock-login-form submit aria-label em-dash convention regression guard。
 *
 * iter1144 で発見した divergence: signup-form (iter1093) と login-form (iter1143) は
 * visible-prefix em-dash convention `'<visible> — <descriptive>'` に統一済だが、
 * mock-timesheet/mock-login-form の submit button は旧 paren convention のままで
 * sibling auth form 集合と style 揃わず divergence していた。
 *
 * 修正 (mock-login-form.tsx): default + pending 2 path em-dash 化
 *   - default: 'ログイン — mock-timesheet email + password で認証'
 *   - pending: '認証中… — mock-timesheet 認証処理を実行中'
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-login-em-dash-iter1144.ts
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
  const filePath = resolve(here, '../src/components/mock-timesheet/mock-login-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'ログイン — mock-timesheet email + password で認証'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form default aria-label が em-dash 形式 "ログイン — ..." でない',
    })
  }
  if (!src.includes("'認証中… — mock-timesheet 認証処理を実行中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-login-form pending aria-label が em-dash 形式 "認証中… — ..." でない',
    })
  }
  if (src.includes("'ログイン (mock-timesheet email + password で認証)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren aria-label "ログイン (mock-timesheet ...)" が残存',
    })
  }
  if (src.includes("'認証中… (mock-timesheet 認証処理を実行中)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '旧 paren aria-label "認証中… (mock-timesheet ...)" が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — mock-login-form submit aria-label は sibling auth form と em-dash convention で統一済',
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
