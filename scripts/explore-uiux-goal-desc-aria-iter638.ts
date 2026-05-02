/**
 * Phase 6.15 loop iter 638 (mode-D Desktop a11y) —
 * goals-panel goal-desc Textarea aria-label を 3-state 動的化
 * (33 input 統一達成、Goal description 補足 hint)。
 *
 * 課題: goals-panel.tsx 行 219 の goal-desc Textarea は aria-label が static で
 *   文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 3-state 動的化 (max 2000、空欄 hint に「Objective の補足や背景」)
 *
 * iter637 sprint-goal pattern を goal-desc に展開、saikyo-todo 内 動的
 * aria-label が 33 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-637 invariant cross-check。
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

  // 1. 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Goal の説明 \(任意、最大 2000 文字、Objective の補足や背景、Cmd\/Ctrl\+Enter で作成\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-desc 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-desc 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /description\.length > 1900\s*\n?\s*\?\s*`Goal の説明 \(現在 \$\{description\.length\} \/ 2000 文字、上限近接、Cmd\/Ctrl\+Enter で作成\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-desc 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-desc 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`Goal の説明 \(現在 \$\{description\.length\} \/ 2000 文字、Cmd\/Ctrl\+Enter で作成\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-desc 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-desc 通常 hint なし` })
  }

  // 4. iter637 invariant: sprint-goal 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /goal\.length === 0\s*\n?\s*\?\s*'Sprint ゴール \(任意、最大 500 文字、この Sprint で達成したいこと、Cmd\/Ctrl\+Enter で作成\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter637 invariant: sprint-goal 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter637 invariant: 破壊` })
  }

  // 5. iter612 invariant: goal-title 維持
  if (
    /title\.length === 0\s*\n?\s*\?\s*'Goal Objective \(必須、最大 200 文字、なに \/ なぜを 1 行で\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter612 invariant: goal-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter612 invariant: 破壊` })
  }

  // 6. iter592 invariant: goals mode select 維持
  if (/aria-label=\{`KR 進捗算出モード \(現在: \$\{/.test(gp)) {
    findings.push({ level: 'info', message: `iter592 invariant: goals mode 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter592 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-desc-aria-iter638) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
