/**
 * Phase 6.15 loop iter 604 (mode-D Desktop a11y) —
 * item-edit-dialog Key Result <select> に動的 aria-label (3-state、iter603 Sprint と pair)。
 *
 * 課題: item-edit-dialog.tsx 行 587-595 の editKr <select> は <Label htmlFor> による
 *   accessible name のみで、current KR / 未割当 / pending 状態が aria 側で明示されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label IIFE で 3-state 動的化:
 *     - assignKr.isPending: 'Key Result 割当を更新中…'
 *     - current あり: `Key Result「${title}」(Goal「${goalTitle}」) に割当中 (変更で別 KR へ移動)`
 *     - current なし: 'Key Result 未割当 (選択で稼働中 Goal の KR に割当)'
 *
 * iter603 Sprint と pair で OKR 領域の aria-label 動的化を完成。
 *
 * 検証: source-side regex assert + iter515-603 invariant cross-check。
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

  // 1. editKr aria-label IIFE 動的化
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(krsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editKr aria-label IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `editKr aria-label IIFE なし` })
  }

  // 2. pending 状態 expose
  if (/assignKr\.isPending\s*\n?\s*\?\s*'Key Result 割当を更新中…'/.test(ied)) {
    findings.push({ level: 'info', message: `pending 状態 expose OK` })
  } else {
    findings.push({ level: 'warning', message: `pending 状態 expose なし` })
  }

  // 3. current KR + Goal title expose
  if (
    /`Key Result「\$\{current\.title\}」\(Goal「\$\{current\.goalTitle\}」\) に割当中 \(変更で別 KR へ移動\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `current KR + Goal expose OK` })
  } else {
    findings.push({ level: 'warning', message: `current KR + Goal expose なし` })
  }

  // 4. 未割当 hint expose
  if (/'Key Result 未割当 \(選択で稼働中 Goal の KR に割当\)'/.test(ied)) {
    findings.push({ level: 'info', message: `未割当 hint expose OK` })
  } else {
    findings.push({ level: 'warning', message: `未割当 hint expose なし` })
  }

  // 5. iter603 invariant: editSprint aria-label 維持
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(sprintsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter603 invariant: editSprint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter603 invariant: 破壊` })
  }

  // 6. iter602 invariant: gantt today line aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`今日 \(\$\{format\(new Date\(\), 'yyyy年M月d日 \(eee\)'\)\}\) の縦線`\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter602 invariant: gantt today line 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter602 invariant: 破壊` })
  }

  // 7. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-edit-kr-aria-iter604) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
