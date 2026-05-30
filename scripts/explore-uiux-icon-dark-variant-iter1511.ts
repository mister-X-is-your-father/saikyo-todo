/**
 * Phase 6.15 loop iter1511 (mode-D = icon dark variant補完 sweep continuation):
 * operation-board AlertOctagon 期限超過 icon と item-dependencies-panel 完了済み
 * text に dark variant を補完。
 *
 * Bug: iter1508/1510 で複数 file の icon / text に dark variant 補完しているが
 * まだ残存している箇所:
 *   - src/components/workspace/operation-board-widget.tsx (line 250):
 *     期限超過 Section icon `<AlertOctagon className="text-red-600" />`
 *   - src/components/workspace/item-dependencies-panel.tsx (line 352):
 *     完了済み marker text `text-emerald-600`
 * 両方とも light 固定で dark slate bg 上で hue が浅く視認性低 (iter1391/1508/1510
 * と同 pattern)。
 *
 * 修正: 両 location に `dark:text-{red|emerald}-400` を併記 (iter1510 と
 * byte-identical な fix pattern)。
 *
 * 経路 B: source-side regex assert + iter1510 (sprint-risk + operation-board done
 * yesterday) / iter1508 (sprint-retro trend) invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-icon-dark-variant-iter1511.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const opb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opb.includes('text-red-600 dark:text-red-400')) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: 期限超過 AlertOctagon icon dark variant 不在',
    })
  }
  // iter1510 invariant cross-check (回帰 guard)
  if (!opb.includes('text-emerald-600 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: iter1510 CheckCircle2 dark variant invariant 喪失',
    })
  }

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!idp.includes('text-emerald-600 dark:text-emerald-400')) {
    findings.push({
      level: 'error',
      message: 'item-dependencies-panel.tsx: 完了済み text dark variant 不在',
    })
  }

  // iter1510 sprint-risk-board invariant cross-check (回帰 guard)
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (!srbw.includes('text-rose-600 dark:text-rose-400')) {
    findings.push({
      level: 'error',
      message: 'sprint-risk-board-widget.tsx: iter1510 AlertOctagon dark variant invariant 喪失',
    })
  }

  // iter1508 sprint-retro invariant cross-check (回帰 guard)
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

  console.log(`\n=== Findings (iter1511 icon dark variant 2 location sweep) ===`)
  if (findings.length === 0)
    console.log('(なし) — 2 location dark variant + iter1510/1508 invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
