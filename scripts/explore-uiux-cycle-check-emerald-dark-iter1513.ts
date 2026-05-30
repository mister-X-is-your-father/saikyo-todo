/**
 * Phase 6.15 loop iter1513 (mode-D = dark contrast supplement continuation):
 * cycle-check-stats-card.tsx の「完了」 dd `text-emerald-700` は theme card bg 上で
 * dark mode contrast 不足 (中暗色 emerald-700 on dark slate bg は ~3.4:1 < 4.5)。
 *
 * Bug: src/components/pdca/cycle-check-stats-card.tsx (line 140) の
 *   `<dd className="font-semibold text-emerald-700 tabular-nums">{stats.done}</dd>`
 * は theme card bg 上の「完了」 件数表示で `text-emerald-700` のみ。dark card bg
 * (~#1c1c1c) 上で emerald-700 (#15803d) は ~3.4:1 で WCAG 1.4.3 AA threshold (4.5)
 * 未達。iter1382 で WeeklyInsight delta chip / iter1376 RecoveryPlanSection と同
 * root cause が cycle-check stats にも残存していた (bg-{color}-50 系の「明色 chip」
 * とは異なり theme bg 上の固定暗色 text)。
 *
 * 修正: `dark:text-emerald-400` を併記。emerald-400 (#34d399) は dark bg 上で
 * ~7:1 で AA pass、iter1391/1508/1510/1511 の dark variant 補完 pattern と同。
 * 「未完了」 と「cancelled」 件数は元から theme color (text-muted-foreground 経由)
 * で対象外。
 *
 * 経路 B: source-side regex assert + iter1511 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-cycle-check-emerald-dark-iter1513.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )

  if (!ccs.includes('text-emerald-700 tabular-nums dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'cycle-check-stats-card.tsx: 完了件数 emerald-700 dark variant 不在',
    })
  }

  // iter1511 invariant cross-check
  const opb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opb.includes('text-red-600 dark:text-red-400')) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: iter1511 期限超過 dark variant invariant 喪失',
    })
  }

  // iter1510 sprint-card invariant cross-check
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (!sp.includes("'text-emerald-600 dark:text-emerald-400'")) {
    findings.push({
      level: 'error',
      message: 'sprints-panel.tsx: iter1510 副 toneIconClass dark variant invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1513 cycle-check 完了 emerald dark variant) ===`)
  if (findings.length === 0)
    console.log('(なし) — cycle-check 完了 dark variant + iter1510 副 / iter1511 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
