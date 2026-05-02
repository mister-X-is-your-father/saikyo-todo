/**
 * Phase 6.15 loop iter 642 (mode-D Desktop a11y) —
 * goals-panel goal-start + goal-end Input aria-label を 3-state 動的化
 * (40 input 統一達成、不正範囲 alert)。
 *
 * 課題: goals-panel.tsx 行 172-180 と 187-194 の goal-start / goal-end Input は
 *   <Label htmlFor> のみで current 値 / 不正範囲が aria 側で expose されない。
 *
 * fix (1 ファイル ~16 行差分、2 input):
 *   - start: 空欄 / 不正範囲 (終了日より後) / 有効
 *   - end: 空欄 / 不正範囲 (開始日より前) / 有効
 *
 * iter641 sprint-edit-dates pattern を goal dates に展開、saikyo-todo 内
 * 動的 aria-label が 40 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-641 invariant cross-check。
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

  // 1. goal-start 空欄 hint
  if (/startDate === ''\s*\n?\s*\?\s*'Goal 開始日 \(必須、終了日以前\)'/.test(gp)) {
    findings.push({ level: 'info', message: `goal-start 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-start 空欄 hint なし` })
  }

  // 2. goal-start 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, endDate\)\s*\n?\s*\?\s*`Goal 開始日 \(現在: \$\{startDate\}、終了日 \$\{endDate\} より後で不正\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-start 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-start 不正範囲 hint なし` })
  }

  // 3. goal-end 空欄 hint
  if (/endDate === ''\s*\n?\s*\?\s*'Goal 終了日 \(必須、開始日以降\)'/.test(gp)) {
    findings.push({ level: 'info', message: `goal-end 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-end 空欄 hint なし` })
  }

  // 4. goal-end 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, endDate\)\s*\n?\s*\?\s*`Goal 終了日 \(現在: \$\{endDate\}、開始日 \$\{startDate\} より前で不正\)`/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goal-end 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `goal-end 不正範囲 hint なし` })
  }

  // 5. iter641 invariant: sprint-edit-start 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/editStart === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter641 invariant: sprint-edit-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter641 invariant: 破壊` })
  }

  // 6. iter638 invariant: goal-desc 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Goal の説明 \(任意、最大 2000 文字、Objective の補足や背景、Cmd\/Ctrl\+Enter で作成\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter638 invariant: goal-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter638 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-dates-aria-iter642) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
