/**
 * Phase 6.15 loop iter 648 (mode-D Desktop a11y) —
 * sprints-panel sprint-start + sprint-end (作成 form) Input aria-label を 3-state
 * 動的化 (49 input 統一達成)。
 *
 * 課題: sprints-panel.tsx 行 232-240 と 246-254 の sprint-start / sprint-end (作成)
 *   Input は <Label htmlFor> のみで current 値 / 不正範囲が aria 側で expose されない。
 *   iter641 で同 sprint の編集モード dates は covered だが作成モード dates は未対応。
 *
 * fix (1 ファイル ~16 行差分、2 input):
 *   - start: 空欄 / 不正範囲 / 有効 (現在: YYYY-MM-DD)
 *   - end: 空欄 / 不正範囲 / 有効 (現在: YYYY-MM-DD)
 *
 * iter642 goal-dates pattern を sprint-create-dates に展開、saikyo-todo 内
 * 動的 aria-label が 49 input 統一達成 (47 + 2)。
 *
 * 検証: source-side regex assert + iter515-647 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-start (作成) 空欄 hint
  if (/startDate === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-start (作成) 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-start (作成) 空欄 hint なし` })
  }

  // 2. sprint-start (作成) 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, endDate\)\s*\n?\s*\?\s*`Sprint 開始日 \(現在: \$\{startDate\}、終了日 \$\{endDate\} より後で不正\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-start (作成) 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-start (作成) 不正範囲 hint なし` })
  }

  // 3. sprint-end (作成) 空欄 hint
  if (/endDate === ''\s*\n?\s*\?\s*'Sprint 終了日 \(必須、開始日以降\)'/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-end (作成) 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-end (作成) 空欄 hint なし` })
  }

  // 4. sprint-end (作成) 不正範囲 hint
  if (
    /isInvalidDateRange\(startDate, endDate\)\s*\n?\s*\?\s*`Sprint 終了日 \(現在: \$\{endDate\}、開始日 \$\{startDate\} より前で不正\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-end (作成) 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-end (作成) 不正範囲 hint なし` })
  }

  // 5. iter647 invariant: teDate 維持
  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter647 invariant: teDate 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter647 invariant: 破壊` })
  }

  // 6. iter641 invariant: sprint-edit-start 維持
  if (/editStart === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `iter641 invariant: sprint-edit-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter641 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-create-dates-aria-iter648) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
