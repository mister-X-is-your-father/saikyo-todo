/**
 * Phase 6.15 loop iter 703 (mode-D Desktop a11y) —
 * goals-panel goal-card actions row に role=group + aria-label 追加
 * (iter702 sprint card と同 pattern を Goal card に展開)。
 *
 * 課題: goals-panel.tsx 行 468 の Goal card 内 actions row `<div>` (完了 / アーカイブ /
 *   再開 button 群) は role / aria-label 無し。SR ナビで複数 button が同階層に並ぶが
 *   group context 不明。
 *
 * fix (1 ファイル ~5 行差分):
 *   - actions row に `role="group"` + dynamic `aria-label={`Goal「${goal.title}」のステータス操作 (完了 / アーカイブ / 再開)`}`
 *
 * iter701 (gantt summary) / iter702 (sprint-card actions) と同 pattern。
 *
 * 検証: source-side regex assert + iter515-702 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. goal-card actions role=group + aria-label
  if (
    /role="group"\s*\n\s*aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-card actions role=group + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-card actions role=group + aria-label なし` })
  }

  // 2. iter702 invariant: sprint-card actions group 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /role="group"\s*\n\s*aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter702 invariant: sprint-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter702 invariant: 破壊` })
  }

  // 3. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /role="group"\s*\n\s*aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  // 4. iter699 invariant: goals-list aria-label 維持 (= goals-panel 同 file)
  if (
    /data-testid="goals-list"\s*\n\s*aria-label=\{`Goal 一覧 \$\{list\.data\.length\} 件`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter699 invariant: goals-list 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter699 invariant: 破壊` })
  }

  // 5. iter673 invariant: goal-toggle 維持 (= goals-panel 同 file)
  if (
    /hover:bg-muted focus-visible:ring-ring mt-0\.5 rounded p-1 focus-visible:ring-2 focus-visible:outline-none/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter673 invariant: goal-toggle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter673 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-card-actions-iter703) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
