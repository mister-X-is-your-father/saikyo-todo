/**
 * Phase 6.15 loop iter1520 (mode-D = chip dark variant補完 sweep continuation):
 * subtasks-panel.tsx の summary box 3 tone (isComplete/blocked/default) は
 * border/bg/ring の 3 set が全部 light 固定で dark mode で明色 box が浮く。
 *
 * Bug: src/components/workspace/subtasks-panel.tsx (line 467-473) の
 * descendantsProgress summary box は `rounded-md border px-3 py-2 ring-1 ring-inset`
 * で 3 tone を 3 set token (border/bg/ring) で描画:
 *   complete: `border-emerald-200 bg-emerald-50 ring-emerald-200`
 *   blocked:  `border-amber-200   bg-amber-50   ring-amber-200`
 *   default:  `border-slate-200   bg-slate-50   ring-slate-200`
 * 全 3 tone × 3 token = 9 個が light 固定で dark mode で明色 box が浮く。
 * iter1515-1518 chip dark sweep の続編、本 box は ring も含むため 4 token (border
 * + bg + ring 2回相当) になる新パターン。
 *
 * 修正: 3 tone に `dark:border-{color}-900/50 dark:bg-{color}-950/30
 * dark:ring-{color}-900/50` を併記 (default tone は slate-700/50 / slate-900/30
 * / slate-700/50 で dark slate adjusted)。iter1515 dashboard-view inline chip
 * sweep と同 pattern (border + bg) を ring 込み 3 set に拡張。
 *
 * 経路 B: source-side regex assert + iter1518 streak / iter1517 estimate-bias
 * invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-subtasks-summary-box-dark-iter1520.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  const tones: { color: string; suffix: string; tag: string }[] = [
    { color: 'emerald', suffix: '900/50', tag: 'complete' },
    { color: 'amber', suffix: '900/50', tag: 'blocked' },
    { color: 'slate', suffix: '700/50', tag: 'default' },
  ]

  for (const t of tones) {
    // bg は slate のみ 900/30、他 color は 950/30
    const bgSuffix = t.color === 'slate' ? '900/30' : '950/30'
    if (
      !sp.includes(
        `dark:border-${t.color}-${t.suffix} dark:bg-${t.color}-${bgSuffix} dark:ring-${t.color}-${t.suffix}`,
      )
    ) {
      findings.push({
        level: 'error',
        message: `subtasks-panel.tsx: ${t.tag} (${t.color}) dark token (3 件) 不在`,
      })
    }
  }

  // iter1518 top-items streak invariant cross-check (回帰 guard)
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (!ti.includes('dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50')) {
    findings.push({
      level: 'error',
      message: 'top-items-by-time-chip.tsx: iter1518 streak invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1520 subtasks summary box 3 tone dark variant) ===`)
  if (findings.length === 0)
    console.log('(なし) — 3 tone dark token (border+bg+ring) + iter1518 streak invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
