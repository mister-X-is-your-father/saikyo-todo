/**
 * Phase 6.15 loop iter1518 (mode-D = chip dark variant補完 sweep continuation):
 * top-items-by-time-chip.tsx の streak active chip は light 固定で dark mode で
 * 明色 box が浮く。
 *
 * Bug: src/components/time-entry/top-items-by-time-chip.tsx の streakClass
 * (line 96-98) は streakActive 時 `bg-emerald-50 text-emerald-700 border-emerald-200`、
 * inactive 時 `bg-muted text-foreground border-border` (theme-aware)。active path
 * のみ light 固定で dark mode で明色 box が浮く。iter1515/1516/1517 chip dark
 * sweep の最後の 1 件。
 *
 * 修正: active path に `dark:bg-emerald-950/30 dark:text-emerald-300
 * dark:border-emerald-900/50` を併記、inactive path は theme-aware で touch なし。
 *
 * 経路 B: source-side regex assert + iter1517 estimate-bias / iter1516
 * calibrated chip invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-top-items-streak-chip-dark-iter1518.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  // 1. active path に dark token 3 件
  if (
    !ti.includes(
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    )
  ) {
    findings.push({
      level: 'error',
      message: 'top-items-by-time-chip.tsx: streak active dark token (3 件) 不在',
    })
  }
  // 2. inactive path は theme-aware で touch なし (回帰 guard)
  if (!ti.includes("'bg-muted text-foreground border-border'")) {
    findings.push({
      level: 'error',
      message: 'top-items-by-time-chip.tsx: streak inactive theme-aware invariant 喪失',
    })
  }

  // iter1517 estimate-bias TENDENCY_TONE invariant cross-check
  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (!ebi.includes('dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50')) {
    findings.push({
      level: 'error',
      message: 'estimate-bias-insight.tsx: iter1517 on-track tone invariant 喪失',
    })
  }

  // iter1516 calibrated chip invariant cross-check
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300')) {
    findings.push({
      level: 'error',
      message: 'active-timer-panel.tsx: iter1516 calibrated invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1518 top-items streak active chip dark variant) ===`)
  if (findings.length === 0)
    console.log('(なし) — streak active dark + inactive theme-aware + iter1517/1516 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
