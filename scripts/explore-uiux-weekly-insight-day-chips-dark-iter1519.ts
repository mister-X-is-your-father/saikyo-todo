/**
 * Phase 6.15 loop iter1519: weekly-insight-widget best-day + worst-day chip に dark variant
 * を補完 (mode-D contrast、iter1376/1493/1512-1518 chip pattern を本 2 chip family に展開)。
 *
 * weekly-insight-widget の best-day chip (emerald) と worst-day chip (amber/slate
 * conditional) は light 固定描画、dark mode で 明色 chip 浮き contrast 不適。
 *
 * 修正 (weekly-insight-widget.tsx):
 *   best-day:        `bg-emerald-50 text-emerald-700`
 *                  → + `dark:bg-emerald-950/30 dark:text-emerald-300`
 *   worst-day amber: `bg-amber-50 text-amber-700`
 *                  → + `dark:bg-amber-950/30 dark:text-amber-300`
 *   worst-day slate: `bg-slate-50 text-slate-700`
 *                  → + `dark:bg-slate-900/30 dark:text-slate-300`
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-weekly-insight-day-chips-dark-iter1519.ts
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
  const filePath = resolve(here, '../src/components/workspace/weekly-insight-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      'bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight best-day chip に dark variant が無い',
    })
  }
  if (!src.includes("'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight worst-day amber chip に dark variant が無い',
    })
  }
  if (!src.includes("'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-insight worst-day slate chip に dark variant が無い',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — weekly-insight best/worst-day chip に dark variant 補完済')
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
