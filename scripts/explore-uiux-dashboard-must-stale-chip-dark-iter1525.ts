/**
 * Phase 6.15 loop iter1525: dashboard-view must-stale chip に dark variant を補完
 * (mode-D contrast、iter1515 でこぼれた `border-red-300 bg-red-50 text-red-800` の 1 件)。
 *
 * 修正 (dashboard-view.tsx):
 *   must-stale chip (line 1186): `border-red-300 bg-red-50 text-red-800`
 *                              → + `dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200`
 *
 *   iter1515 は `border-red-200 bg-red-50 text-red-700` の 6 件 + amber 1 件 を覆ったが、
 *   この must-stale chip は `border-red-300` + `text-red-800` で variant が異なるため
 *   replace_all から外れていた。本 iter で着地。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-must-stale-chip-dark-iter1525.ts
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
      'border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-view must-stale chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — dashboard-view must-stale chip に dark variant 補完済')
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
