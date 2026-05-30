/**
 * Phase 6.15 loop iter1527: dashboard-view must-stuck-wip chip + must-overdue chip に dark
 * variant を補完 (mode-D contrast、iter1525 で must-stale を覆ったが残 2 chip がこぼれていた)。
 *
 * 修正 (dashboard-view.tsx):
 *   must-stuck-wip (line 1153): `border-red-300 bg-red-100 text-red-800`
 *                             → + `dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200`
 *   must-overdue (line 1169): `border-red-400 bg-red-100 text-red-900` (最高 severity)
 *                            → + `dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-100`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-must-stuck-overdue-dark-iter1527.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')

  if (
    !src.includes(
      'border-red-300 bg-red-100 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view must-stuck-wip chip に dark variant が無い',
    })
  }
  if (
    !src.includes(
      'border-red-400 bg-red-100 text-red-900 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-100',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view must-overdue chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dashboard-view must-stuck-wip + must-overdue chip に dark variant 補完済')
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
