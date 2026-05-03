/**
 * Phase 6.15 loop iter 676 (mode-D Desktop a11y) —
 * subtasks-panel subtask-drag (GripVertical 並び替え handle) plain button に
 * focus-visible ring 追加 (iter671-675 sweep 継続)。
 *
 * 課題: subtasks-panel.tsx 行 156 の subtask-drag button (DnD handle) は
 *   focus-visible 無し。同 file 内の subtask-outdent / subtask-indent button は
 *   既に focus-visible:ring-* 持つので drag handle だけ漏れていた。
 *   keyboard ユーザは Tab で focus してもどの subtask の drag handle に居るか不可視。
 *
 * fix (1 ファイル ~1 行差分):
 *   - className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none` + `rounded` 追加
 *
 * 検証: source-side regex assert + iter515-675 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. subtask-drag に focus-visible
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 cursor-grab touch-none rounded before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `subtask-drag focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `subtask-drag focus-visible なし` })
  }

  // 2. iter651 invariant: subtasks-bulk 通常 hint 維持 (subtasks-panel 同 file)
  if (
    /:\s*`子タスクを改行区切りで bulk 追加 \(現在 \$\{pendingTitleCount\} 件、Cmd\/Ctrl\+Enter で追加\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter651 invariant: subtasks-bulk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter651 invariant: 破壊` })
  }

  // 3. iter655 invariant: subtasks overDepth ⚠ 維持 (subtasks-panel 同 file)
  if (/<span aria-hidden="true">⚠ <\/span>深さ \{MAX_TREE_DEPTH\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter655 invariant: subtasks overDepth ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter655 invariant: 破壊` })
  }

  // 4. iter675 invariant: board-empty-quick-add 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (
    /text-primary hover:bg-muted focus-visible:ring-ring mt-2 inline-flex min-h-11 items-center rounded border px-3 py-1\.5 text-xs hover:underline focus-visible:ring-2 focus-visible:outline-none/.test(
      ib,
    )
  ) {
    findings.push({ level: 'info', message: `iter675 invariant: board-empty-quick-add 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter675 invariant: 破壊` })
  }

  // 5. iter671 invariant: severity-chip focus-visible 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subtasks-drag-focus-iter676) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
