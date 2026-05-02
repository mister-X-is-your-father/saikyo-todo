/**
 * Phase 6.15 loop iter 641 (mode-D Desktop a11y) —
 * sprints-panel sprint-edit-start + sprint-edit-end Input aria-label を 3-state
 * 動的化 (38 input 統一達成、現在日付 + 曜日 + 不正範囲 alert)。
 *
 * 課題: sprints-panel.tsx 行 587-604 と 行 615-628 の sprint-edit-start /
 *   sprint-edit-end Input は static aria-label のみで current 値 / 不正範囲が
 *   aria 側で expose されない。
 *
 * fix (1 ファイル ~16 行差分、2 input):
 *   - start: 空欄 / 不正範囲 (終了日より後) / 有効 (現在: YYYY-MM-DD (曜))
 *   - end: 空欄 / 不正範囲 (開始日より前) / 有効
 *
 * iter640 wf-graph-trigger pattern を sprint edit dates に展開、saikyo-todo
 * 内 動的 aria-label が 38 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-640 invariant cross-check。
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

  // 1. sprint-edit-start 空欄 hint
  if (/editStart === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-edit-start 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-start 空欄 hint なし` })
  }

  // 2. sprint-edit-start 不正範囲 hint
  if (
    /isInvalidDateRange\(editStart, editEnd\)\s*\n?\s*\?\s*`Sprint 開始日 \(現在: \$\{editStart\} \(\$\{dayOfWeekJa\(editStart\)\}\)、終了日 \$\{editEnd\} より後で不正\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-edit-start 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-start 不正範囲 hint なし` })
  }

  // 3. sprint-edit-end 空欄 hint
  if (/editEnd === ''\s*\n?\s*\?\s*'Sprint 終了日 \(必須、開始日以降\)'/.test(sp)) {
    findings.push({ level: 'info', message: `sprint-edit-end 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-end 空欄 hint なし` })
  }

  // 4. sprint-edit-end 不正範囲 hint
  if (
    /isInvalidDateRange\(editStart, editEnd\)\s*\n?\s*\?\s*`Sprint 終了日 \(現在: \$\{editEnd\} \(\$\{dayOfWeekJa\(editEnd\)\}\)、開始日 \$\{editStart\} より前で不正\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-edit-end 不正範囲 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-edit-end 不正範囲 hint なし` })
  }

  // 5. iter640 invariant: wf-graph 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /graphText\.length === 0\s*\n?\s*\?\s*'graph JSON \(workflow の node 定義を JSON で記述、上のプリセット button で skeleton 追加可\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter640 invariant: wf-graph 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter640 invariant: 破壊` })
  }

  // 6. iter637 invariant: sprint-goal 維持
  if (
    /goal\.length === 0\s*\n?\s*\?\s*'Sprint ゴール \(任意、最大 500 文字、この Sprint で達成したいこと、Cmd\/Ctrl\+Enter で作成\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter637 invariant: sprint-goal 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter637 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-edit-dates-aria-iter641) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
