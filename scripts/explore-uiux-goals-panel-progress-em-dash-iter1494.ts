/**
 * Phase 6.15 loop iter1494 (mode-D = aria-label sweep continuation): goals-panel.tsx の
 * Goal 全体進捗 progressbar aria-label `(${health.label})` → `— ${health.label}`。
 *
 * Bug: goals-panel.tsx の Goal 全体進捗 progressbar aria-label は
 *   `Goal「${title}」全体進捗 ${pct}%${health ? ` (${health.label})` : ''}`
 * で () 区切が残存。直下の aria-valuetext は `— ${health.label}` 区切で既に
 * em-dash に統一されていたが、aria-label との divergence で SR で「half-pattern
 * の混在」 が露見 (iter1093-1151 sweep + iter1493 副 operation-board と同 root)。
 *
 * 修正: aria-label の `( ${health.label} )` を `— ${health.label}` に統一、
 * 同 row の aria-valuetext と byte-identical な punctuation 体系に。
 *
 * 経路 B: source-side regex assert + iter1493 副 operation-board invariant cross-check。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-goals-panel-progress-em-dash-iter1494.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const goals = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. aria-label の () 区切が消えている
  if (goals.includes('全体進捗 ${goalPct}%${health ? ` (${health.label})')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: Goal 進捗 aria-label に () 区切が残存',
    })
  }
  // 2. em-dash 区切が入っている
  if (!goals.includes('全体進捗 ${goalPct}%${health ? ` — ${health.label}')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: Goal 進捗 aria-label に em-dash 区切が無い',
    })
  }
  // 3. aria-valuetext は元々 em-dash で同 punctuation (回帰 guard)
  if (!goals.includes('aria-valuetext={`${goalPct}%${health ? ` — ${health.label}')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: aria-valuetext em-dash 規約 喪失',
    })
  }
  // 4. iter1493 副 operation-board invariant cross-check (回帰 guard)
  const opboard = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!opboard.includes('を開く — 見積')) {
    findings.push({
      level: 'error',
      message: 'operation-board-widget.tsx: iter1493 副 em-dash invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1494 goals-panel progress em-dash sweep) ===`)
  if (findings.length === 0)
    console.log(
      '(なし) — goals-panel aria-label em-dash + iter1493 副 operation-board invariant OK',
    )
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
