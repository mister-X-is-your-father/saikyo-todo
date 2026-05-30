/**
 * Phase 6.15 loop iter1490: signup-form pending aria-label em-dash convention 統一 (regression guard)。
 *
 * iter1144 で mock-login-form は em-dash 統一済、login-form (iter1143) も統一済だが、
 * signup-form の **pending** 側のみ '作成中… — アカウント作成中 (サインアップ処理を実行中)' という
 * em-dash + paren 混在で残っており、auth form 集合 (login / signup / mock-login) で divergence。
 *
 * 修正 (signup-form.tsx):
 *   pending: '作成中… — アカウント作成中 (サインアップ処理を実行中)'
 *         → '作成中… — サインアップ処理を実行中'  (login pending pattern と整合)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-signup-pending-em-dash-iter1490.ts
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
  const filePath = resolve(here, '../src/components/auth/signup-form.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (!src.includes("'作成中… — サインアップ処理を実行中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form pending aria-label が "作成中… — サインアップ処理を実行中" でない',
    })
  }
  if (src.includes("'作成中… — アカウント作成中 (サインアップ処理を実行中)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message:
        '旧 paren 混在 aria-label "作成中… — アカウント作成中 (サインアップ処理を実行中)" が残存',
    })
  }
  if (!src.includes("'サインアップ — アカウントを作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'signup-form default aria-label "サインアップ — アカウントを作成" が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — signup-form pending aria-label は login / mock-login と em-dash convention で統一済',
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
