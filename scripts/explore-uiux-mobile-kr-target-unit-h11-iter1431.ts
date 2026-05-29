/**
 * Phase 6.15 loop iter1431 (mode-M = Mobile audit residual): goals-panel の
 * KR 編集 inline form: 目標値 (target, type=number) と 単位 (unit, IMEInput) が
 * `className="w-32 text-sm"` / `className="w-24 text-sm"` で shadcn Input 既定
 * `h-8` (32px) のまま → WCAG 2.5.5 (target size ≥44x44) 未達。
 *
 * KR 追加 form (line ~842 krTitle IMEInput) は `h-11 flex-1` 設定済、KR 追加 button
 * (line ~934) も `min-h-11` 設定済だが、mode === 'manual' 時の inline 2 input
 * (target, unit) は取り残し。
 *
 * 修正: 2 input に `min-h-11` を追加 (`w-32 text-sm` → `min-h-11 w-32 text-sm`,
 * `w-24 text-sm` → `min-h-11 w-24 text-sm`)、2 line / 1 file。
 *
 * 経路 B (source-side regex assert)。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-mobile-kr-target-unit-h11-iter1431.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  if (!src.includes('className="min-h-11 w-32 text-sm"')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: KR target Input に min-h-11 不在',
    })
  }
  if (!src.includes('className="min-h-11 w-24 text-sm"')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: KR unit IMEInput に min-h-11 不在',
    })
  }

  // iter1208/1209 invariant: goal-start / goal-end / goal-title の min-h-11 + h-11 維持
  if (!src.includes('className="min-h-11"')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: iter1423 goal-start/end min-h-11 invariant 喪失',
    })
  }
  if (!src.includes('className="h-11"')) {
    findings.push({
      level: 'error',
      message: 'goals-panel.tsx: goal-title / krTitle h-11 invariant 喪失',
    })
  }

  console.log(`\n=== Findings (iter1431 KR target/unit min-h-11) ===`)
  if (findings.length === 0)
    console.log('(なし) — KR target + unit min-h-11 + iter1423/goal-title invariant OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
