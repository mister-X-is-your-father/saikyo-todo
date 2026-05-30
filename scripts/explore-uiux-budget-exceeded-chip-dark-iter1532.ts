/**
 * Phase 6.15 loop iter1532: budget-panel exceeded chip (上限到達) に dark variant を補完
 * (mode-D contrast、iter1522 で warn を覆ったが exceeded がこぼれていた)。
 *
 * 修正 (budget-panel.tsx):
 *   exceeded chip (line 111): `bg-red-100 text-red-700`
 *                            → + `dark:bg-red-950/40 dark:text-red-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-budget-exceeded-chip-dark-iter1532.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')

  if (
    !src.includes(
      'bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel exceeded chip (上限到達) に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — budget-panel exceeded chip に dark variant 補完済')
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
