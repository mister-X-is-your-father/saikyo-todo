/**
 * Phase 6.15 loop iter1535: subtasks-panel child count chip に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512-1534 chip dark sweep の残箇所)。
 *
 * 修正 (subtasks-panel.tsx):
 *   child count chip (line 193): `bg-slate-200 text-slate-700`
 *                              → + `dark:bg-slate-800/40 dark:text-slate-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-subtasks-child-count-chip-dark-iter1535.ts
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
  const src = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')

  if (
    !src.includes(
      'bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 tabular-nums dark:bg-slate-800/40 dark:text-slate-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel child count chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — subtasks-panel child count chip に dark variant 補完済')
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
