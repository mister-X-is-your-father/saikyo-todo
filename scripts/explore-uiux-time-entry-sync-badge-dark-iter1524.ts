/**
 * Phase 6.15 loop iter1524: time-entry sync badge 3 状態 (synced/failed/pending) に
 * dark variant を補完 (mode-D contrast、iter1376/1493/1512-1523 chip pattern を本 3 badge
 * family に展開)。
 *
 * 修正 (time-entries-table.tsx):
 *   synced (emerald): `bg-emerald-100 text-emerald-700` + dark:bg-emerald-950/40 + dark:text-emerald-300
 *   failed (red):     `bg-red-100 text-red-700`        + dark:bg-red-950/40 + dark:text-red-300
 *   pending (slate):  `bg-slate-100 text-slate-700`    + dark:bg-slate-900/40 + dark:text-slate-300
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-time-entry-sync-badge-dark-iter1524.ts
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
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  const checks: Array<[string, string]> = [
    ['synced', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'],
    ['failed', 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'],
    ['pending', 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300'],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `time-entry sync badge ${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — time-entry sync badge 3 状態に dark variant 補完済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
