/**
 * Phase 6.15 loop iter1513: dashboard-chip.tsx TONE3_CLASS (good/warn) に dark variant を
 * 補完 (mode-D contrast、iter1376 / iter1493 / iter1512 chip dark variant pattern を本
 * 3-tone map にも展開)。
 *
 * DashboardChip の TONE3_CLASS は ChipTone3 ('good' / 'neutral' / 'warn') ごとに chip の
 * border + bg + text class を定義。neutral は CSS var (border-border / bg-muted /
 * text-foreground) で theme-aware だが、good/warn は light 固定で dark mode で明色 box が
 * 浮き text contrast 不適。iter1376 RecoveryPlanSection / iter1493 data-widget-card error /
 * iter1512 operation-board forecast chip と同 root pattern。
 *
 * 修正 (dashboard-chip.tsx):
 *   good: `border-emerald-200 bg-emerald-50 text-emerald-700`
 *       → 上記 + `dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300`
 *   warn: `border-amber-200 bg-amber-50 text-amber-700`
 *       → 上記 + `dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300`
 *   neutral: 変更なし (CSS var theme-aware)
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-dashboard-chip-tone3-dark-iter1513.ts
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
  const filePath = resolve(here, '../src/components/workspace/dashboard-chip.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      "good: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-chip TONE3_CLASS.good に dark variant が無い',
    })
  }
  if (
    !src.includes(
      "warn: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dashboard-chip TONE3_CLASS.warn に dark variant が無い',
    })
  }
  if (!src.includes("neutral: 'border-border bg-muted text-foreground'")) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: 'dashboard-chip TONE3_CLASS.neutral が theme-aware でない',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — dashboard-chip TONE3_CLASS の good/warn に dark variant 補完済、neutral theme-aware 維持',
    )
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
