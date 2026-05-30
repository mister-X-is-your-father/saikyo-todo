/**
 * Phase 6.15 loop iter1516: sprint-retro-widget StatusChip 4 tone (ok/warn/muted/default) に
 * dark variant を補完 (mode-D contrast、iter1376/1493/1512-1515 chip pattern を本 4 tone に展開)。
 *
 * sprint-retro-widget の StatusChip は Sprint 終了時の status 分布 (todo / 進行中 / blocked /
 * done / cancelled) を表示する chip。4 tone (ok/warn/muted/default) すべて
 * `border-{color}-200/300 bg-{color}-50/100 text-{color}-600/700` で light 固定描画、dark
 * mode で明色 chip 浮き contrast 不適。iter1376/1493/1512-1515 pattern を本 4 tone に展開。
 *
 * 修正 (sprint-retro-widget.tsx):
 *   ok:      emerald-300/50/700 → + dark:emerald-900/50 + dark:bg-emerald-950/30 + dark:text-emerald-300
 *   warn:    amber-300/50/700  → + dark:amber-900/50 + dark:bg-amber-950/30 + dark:text-amber-300
 *   muted:   slate-300/100/600 → + dark:slate-700/50 + dark:bg-slate-900/30 + dark:text-slate-400
 *   default: slate-200/50/700  → + dark:slate-700/50 + dark:bg-slate-900/30 + dark:text-slate-300
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprint-retro-status-chip-dark-iter1516.ts
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
  const filePath = resolve(here, '../src/components/sprint/sprint-retro-widget.tsx')
  const src = readFileSync(filePath, 'utf8')

  const checks: Array<[string, string]> = [
    [
      'ok',
      "'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'",
    ],
    [
      'warn',
      "'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'",
    ],
    [
      'muted',
      "'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400'",
    ],
    [
      'default',
      "'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300'",
    ],
  ]
  for (const [name, expected] of checks) {
    if (!src.includes(expected)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-retro StatusChip.${name} に dark variant が無い`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprint-retro StatusChip 4 tone に dark variant 補完済')
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
