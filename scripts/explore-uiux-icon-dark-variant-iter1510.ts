/**
 * Phase 6.15 loop iter1510 (mode-D = icon dark variant補完 sweep continuation):
 * sprint-risk-board AlertOctagon icon と operation-board CheckCircle2 icon に
 * dark variant を補完。
 *
 * Bug: iter1508 で sprint-retro-widget の trendIcon 3 件 (TrendingUp/Down/Flat) に
 * dark variant を補完したのと同じ root cause が複数 file に残存:
 *   - src/components/sprint/sprint-risk-board-widget.tsx (line 64):
 *     `<AlertOctagon className="h-4 w-4 text-rose-600" aria-hidden="true" />`
 *   - src/components/workspace/operation-board-widget.tsx (line 330):
 *     `<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />`
 * 両 icon とも `text-{color}-600` が light 固定で dark slate bg 上で hue が浅く
 * 視認性低 (iter1391/iter1508 と同 pattern、icon は aria-hidden で WCAG 1.4.3
 * 必須ではないが「ぱっと見の伝達」 を保つため dark variant 補完)。
 *
 * 修正: 両 icon に `dark:text-{color}-400` を併記、iter1508 sprint-retro と
 * byte-identical な fix pattern。
 *
 * 経路 B: source-side regex assert + iter1508 sprint-retro / iter1493
 * data-widget-card invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-icon-dark-variant-iter1510.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!srbw.includes('text-rose-600 dark:text-rose-400')) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: AlertOctagon icon dark variant 不在',
    })
  }

  const opb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opb.includes('text-emerald-600 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: CheckCircle2 icon dark variant 不在',
    })
  }

  // iter1508 sprint-retro trendIcon invariant cross-check (回帰 guard)
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (!srw.includes('text-emerald-600 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'sprint-retro-widget.tsx: iter1508 trendIcon dark variant invariant 喪失',
    })
  }

  // iter1493 data-widget-card error dark invariant cross-check (回帰 guard)
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (!dwc.includes('dark:border-rose-900/50') || !dwc.includes('dark:bg-rose-950/30')) {
    findings.push({
      level: 'error',
      message: 'data-widget-card.tsx: iter1493 error dark invariant 喪失',
    })
  }

  // iter1507 sprint-risk-board item button em-dash invariant cross-check (回帰 guard)
  if (!srbw.includes('を開く — risk score ${entry.riskScore}')) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: iter1507 em-dash invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1510 icon dark variant 2 component sweep) ===`)
  if (findings.length === 0)
    console.log('(なし) — 2 icon dark variant + iter1508/1493/1507 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
