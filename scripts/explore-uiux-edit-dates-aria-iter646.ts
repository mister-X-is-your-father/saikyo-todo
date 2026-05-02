/**
 * Phase 6.15 loop iter 646 (mode-D Desktop a11y) —
 * item-edit-dialog editStart + editDue Input aria-label を 3-state 動的化
 * (46 input 統一達成、不正範囲 alert)。
 *
 * 課題: item-edit-dialog.tsx 行 524-533 と 539-547 の editStart / editDue Input は
 *   <Label htmlFor> のみで current 値 / 不正範囲が aria 側で expose されない。
 *
 * fix (1 ファイル ~16 行差分、2 input):
 *   - editStart: 空欄 (期限以前 hint) / 不正範囲 / 有効
 *   - editDue: 空欄 (MUST 期限 + Heartbeat hint) / 不正範囲 / 有効
 *
 * iter645 editDod pattern を edit-dates に展開、saikyo-todo 内 動的 aria-label
 * が 46 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-645 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. editStart 空欄 hint
  if (/startDate === ''\s*\n?\s*\?\s*'開始日 \(任意、期限以前\)'/.test(ied)) {
    findings.push({ level: 'info', message: `editStart 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editStart 空欄 hint なし` })
  }

  // 2. editStart 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, dueDate\)\s*\n?\s*\?\s*`開始日 \(現在: \$\{startDate\}、期限 \$\{dueDate\} より後で不正\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editStart 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editStart 不正範囲 hint なし` })
  }

  // 3. editDue 空欄 hint (MUST + Heartbeat)
  if (
    /dueDate === ''\s*\n?\s*\?\s*'期限 \(任意、開始日以降、MUST item は期限 \+ Heartbeat 通知が必須\)'/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editDue 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDue 空欄 hint なし` })
  }

  // 4. editDue 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, dueDate\)\s*\n?\s*\?\s*`期限 \(現在: \$\{dueDate\}、開始日 \$\{startDate\} より前で不正\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editDue 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDue 不正範囲 hint なし` })
  }

  // 5. iter645 invariant: editDod 維持
  if (
    /dod\.length === 0\s*\n?\s*\?\s*'DoD 完了条件 \(MUST item は必須、空欄では保存・done 遷移不可\)'/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter645 invariant: editDod 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter645 invariant: 破壊` })
  }

  // 6. iter642 invariant: goal-start 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/startDate === ''\s*\n?\s*\?\s*'Goal 開始日 \(必須、終了日以前\)'/.test(gp)) {
    findings.push({ level: 'info', message: `iter642 invariant: goal-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter642 invariant: 破壊` })
  }

  console.log(`\n=== Findings (edit-dates-aria-iter646) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
