/**
 * Phase 6.15 loop iter1514: activity-log top-actor chip に dark variant を補完
 * (mode-D contrast、iter1376/1493/1512/1513 chip dark variant pattern を本 chip にも展開)。
 *
 * activity-log の top-actor chip (line 122) は `border-emerald-200 bg-emerald-50 text-emerald-700`
 * で light 固定描画、dark mode で明色 chip が浮き contrast 不適。iter1513 dashboard-chip
 * TONE3_CLASS / iter1512 operation-board forecast chip と同 root pattern。
 *
 * 修正 (activity-log.tsx):
 *   chip className: `border-emerald-200 bg-emerald-50 text-emerald-700`
 *                 → + `dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-activity-log-top-actor-dark-iter1514.ts
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
  const filePath = resolve(here, '../src/components/workspace/activity-log.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      'border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log top-actor chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — activity-log top-actor chip に dark variant 補完済')
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
