/**
 * Phase 6.15 loop iter1514 (mode-D = dark contrast supplement continuation):
 * calendar-view.tsx の 2 lane heading (想定タイムライン indigo-700 / 実測タイム
 * ライン emerald-700) は theme `bg-background` 上で dark mode contrast 不足。
 *
 * Bug: src/components/schedule/calendar-view.tsx の Calendar 2 車線 view で
 *   - line 250: 想定 lane heading `text-indigo-700`
 *   - line 270: 実測 lane heading `text-emerald-700`
 * 両方とも theme `bg-background` 上に固定暗色 text で dark mode で contrast
 * 不足 (~3.4:1 < 4.5 WCAG 1.4.3 AA threshold)。iter1382/1376/1493/1508-1513 と
 * 同 root cause、Calendar view が dark variant 補完 sweep からこぼれていた。
 *
 * 修正: 両 heading に `dark:text-{indigo|emerald}-400` を併記 (iter1513
 * cycle-check / iter1510 副 sprint-card と同 byte-identical pattern)。
 *
 * 経路 B: source-side regex assert + iter1513 cycle-check / iter1511
 * 期限超過 invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-calendar-lane-heading-dark-iter1514.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )

  if (!cv.includes('text-indigo-700 dark:text-indigo-400')) {
    findings.push({
      level: 'error',
      message: 'calendar-view.tsx: 想定 lane heading indigo dark variant 不在',
    })
  }
  if (!cv.includes('text-emerald-700 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'calendar-view.tsx: 実測 lane heading emerald dark variant 不在',
    })
  }

  // iter1513 cycle-check 完了件数 invariant
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (!ccs.includes('text-emerald-700 tabular-nums dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'cycle-check-stats-card.tsx: iter1513 完了件数 dark variant invariant 喪失',
    })
  }

  // iter1511 期限超過 invariant
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

  console.log(`\n=== Findings (iter1514 calendar lane heading dark variant) ===`)
  if (findings.length === 0)
    console.log('(なし) — calendar 2 lane heading dark + iter1513/1511 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
