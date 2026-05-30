/**
 * Phase 6.15 loop iter 603 (mode-D Desktop a11y) —
 * item-edit-dialog Sprint <select> に動的 aria-label (現在の sprint 名 / 未割当 / pending)。
 *
 * 課題: item-edit-dialog.tsx 行 536-543 の editSprint <select> は <Label htmlFor>
 *   による accessible name のみで、current sprint 名 / 未割当 / pending 状態が
 *   aria 側で明示されない (browser native announce のみ)。SR ユーザは "Sprint,
 *   [option text], combo box" を聞くだけで、optgroup 構造 (active/planning) の
 *   含意も伝わらない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label IIFE で 3-state 動的化:
 *     - assignSprint.isPending: 'Sprint 割当を更新中…'
 *     - current あり: `Sprint「${name}」に割当中 (変更で別 Sprint へ移動)`
 *     - current なし: 'Sprint 未割当 (選択で稼働中 / 計画中 Sprint に割当)'
 *
 * iter587-602 (動的 aria-label expose) pattern を item-edit-dialog Sprint select に
 * 水平展開。
 *
 * 検証: source-side regex assert + iter515-602 invariant cross-check。
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

  // 1. aria-label IIFE で動的化
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(sprintsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editSprint aria-label IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `editSprint aria-label IIFE なし` })
  }

  // 2. pending 状態 expose
  if (/assignSprint\.isPending\s*\n?\s*\?\s*'Sprint 割当を更新中…'/.test(ied)) {
    findings.push({ level: 'info', message: `pending 状態 expose OK` })
  } else {
    findings.push({ level: 'warning', message: `pending 状態 expose なし` })
  }

  // 3. current sprint 名 expose
  if (/`Sprint「\$\{current\.name\}」に割当中 \(変更で別 Sprint へ移動\)`/.test(ied)) {
    findings.push({ level: 'info', message: `current sprint 名 expose OK` })
  } else {
    findings.push({ level: 'warning', message: `current sprint 名 expose なし` })
  }

  // 4. 未割当 hint expose
  if (/'Sprint 未割当 \(選択で稼働中 \/ 計画中 Sprint に割当\)'/.test(ied)) {
    findings.push({ level: 'info', message: `未割当 hint expose OK` })
  } else {
    findings.push({ level: 'warning', message: `未割当 hint expose なし` })
  }

  // 5. iter602 invariant: gantt today line aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`今日 \(\$\{format\(new Date\(\), 'yyyy年M月d日 \(eee\)'\)\}\) の縦線`\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter602 invariant: gantt today line 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter602 invariant: 破壊` })
  }

  // 6. iter600 invariant: sprint-risk item button aria-label 維持
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`\$\{entry\.item\.title\} を開く — risk score \$\{entry\.riskScore\}\$\{/.test(
      srbw,
    )
  ) {
    findings.push({ level: 'info', message: `iter600 invariant: sprint-risk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter600 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-sprint-aria-iter603) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
