/**
 * Phase 6.15 loop iter1608: mock-timesheet top-nav nav landmark aria-label paren を em-dash 区切に
 * migration (iter1093-1607 sweep convention 着地)。
 *
 * 旧 aria-label paren convention `"mock-timesheet (新規入力 / 入力一覧 / ログアウト)"` は iter1093-1607
 * sweep の em-dash 区切と divergent。区切のみ '(' → ' — ' に統一、closing ')' は削除。
 *
 * 修正 (mock-top-nav.tsx):
 *   `mock-timesheet (新規入力 / 入力一覧 / ログアウト)` → `mock-timesheet — 新規入力 / 入力一覧 / ログアウト`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mock-top-nav-em-dash-iter1608.ts
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
  const src = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )

  if (!src.includes('aria-label="mock-timesheet — 新規入力 / 入力一覧 / ログアウト"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav aria-label が em-dash 区切でない',
    })
  }
  if (src.includes('aria-label="mock-timesheet (新規入力 / 入力一覧 / ログアウト)"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav 旧 paren 区切 aria-label が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — mock-top-nav aria-label が em-dash 区切')
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
