/**
 * Phase 6.15 loop iter1533: quick-add MUST DoD warn chip に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512-1532 chip dark sweep の残箇所)。
 *
 * 修正 (quick-add.tsx):
 *   MUST DoD warn chip (line 279): `border-red-300 bg-red-50 text-red-700`
 *                                → + `dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quickadd-must-warn-chip-dark-iter1533.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')

  if (
    !src.includes(
      'border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add MUST DoD warn chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add MUST DoD warn chip に dark variant 補完済')
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
