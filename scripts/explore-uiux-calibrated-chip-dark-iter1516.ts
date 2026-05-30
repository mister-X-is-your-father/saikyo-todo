/**
 * Phase 6.15 loop iter1516 (mode-D = chip dark variant補完 sweep continuation):
 * calibrated chip (active-timer-panel + quick-add) は `bg-cyan-50 text-cyan-600
 * border-cyan-200` で light 固定、dark mode で明色 chip が dark page 上に浮く。
 *
 * Bug: 2 component の calibrated chip (見積校正値 chip):
 *   - src/components/workspace/active-timer-panel.tsx (line 204):
 *     `bg-cyan-50 text-cyan-600 border-cyan-200`
 *   - src/components/workspace/quick-add.tsx (line 265):
 *     `bg-cyan-50 text-cyan-600 border-cyan-200`
 * 両方とも light 固定 chip で dark mode で明色 box が浮く (text contrast 自体は
 * pass だが「dark page と整合しない」 違和感)。iter1376 RecoveryPlanSection /
 * iter1493 data-widget-card / iter1512 forecast chip / iter1513 副 DashboardChip
 * TONE3_CLASS で確立済の dark chip token pattern を本 chip にも展開。
 *
 * 修正: 両 chip に `dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300`
 * を併記 (iter1513 副 dashboard-chip と同 byte-identical pattern)。
 *
 * 連動 invariant: iter1505 calibrated chip aria-label em-dash 統一 は両 chip で
 * 既に着地済、本 iter は視覚 styling のみ変更で aria 経由 SR content は touch なし。
 *
 * 経路 B: source-side regex assert + iter1505 calibrated em-dash invariant
 * cross-check + iter1512/1513 副 chip dark variant invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-calibrated-chip-dark-iter1516.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const files: { path: string; tag: string }[] = [
    {
      path: 'src/components/workspace/active-timer-panel.tsx',
      tag: 'active-timer-panel',
    },
    {
      path: 'src/components/workspace/quick-add.tsx',
      tag: 'quick-add',
    },
  ]

  for (const f of files) {
    const src = readFileSync(resolve(process.cwd(), f.path), 'utf8')
    if (!src.includes('dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300')) {
      findings.push({
        level: 'error',
        message: `${f.tag}: calibrated chip dark token (3 件) 不在`,
      })
    }
  }

  // iter1505 calibrated chip em-dash invariant cross-check (回帰 guard)
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('校正後 ${calibrated.calibratedMinutes}分 — ')) {
    findings.push({
      level: 'error',
      message: 'active-timer-panel.tsx: iter1505 calibrated em-dash invariant 喪失',
    })
  }

  // iter1514 副 calendar lane invariant cross-check (回帰 guard)
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (!cv.includes('text-emerald-700 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'calendar-view.tsx: iter1514 副 lane heading dark variant invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1516 calibrated chip 2 component dark variant) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — 2 calibrated chip dark + iter1505 em-dash / iter1514 副 calendar lane invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
