/**
 * Phase 6.15 loop iter1523: quick-add preview 残 2 chip (indigo tag + violet AI 分解) に
 * dark variant を補完 (mode-D contrast、iter1521 で active-timer + emerald/cyan を覆ったが
 * indigo/violet が残っていた)。
 *
 * 修正 (quick-add.tsx):
 *   tag chip (line 232): `bg-indigo-100 text-indigo-700`
 *                      → + `dark:bg-indigo-950/40 dark:text-indigo-300`
 *   AI 分解 chip (line 289): `bg-violet-100 text-violet-700`
 *                          → + `dark:bg-violet-950/40 dark:text-violet-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-quick-add-tag-decompose-chips-dark-iter1523.ts
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
      'bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add tag chip indigo に dark variant が無い',
    })
  }
  if (
    !src.includes(
      'bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add AI 分解 chip violet に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — quick-add tag (indigo) + AI 分解 (violet) chip に dark variant 補完済')
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
