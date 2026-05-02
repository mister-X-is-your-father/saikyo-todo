/**
 * Phase 6.15 loop iter 651 (mode-D Desktop a11y) —
 * subtasks-panel subtasks-bulk-input textarea aria-label を 3-state 動的化
 * (53 input 統一達成、pendingTitleCount expose)。
 *
 * 課題: subtasks-panel.tsx 行 525-548 の subtasks-bulk-input textarea は
 *   <Label htmlFor> で名前は付くが aria-label が固定で、現在何件入力済か
 *   (parseBulkSubtaskTitles の結果) が SR に expose されない。
 *   入力中の進捗確認が button hint に依存していた。
 *
 * fix (1 ファイル ~7 行差分、1 textarea):
 *   - 空欄: 「子タスクを改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)」
 *   - 空行のみ: 「現在 空行のみで追加対象なし」
 *   - 通常: 「現在 N 件、Cmd/Ctrl+Enter で追加」
 *
 * iter614 (teDescription) と iter616 (comment-input) の char-count + state-aware
 * パターンを bulk textarea に展開、saikyo-todo 内動的 aria-label が 53 input
 * 統一達成 (52 + 1)。
 *
 * 検証: source-side regex assert + iter515-650 invariant cross-check。
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

  // 1. 空欄 hint
  if (
    /bulkText === ''\s*\n?\s*\?\s*'子タスクを改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `subtasks-bulk 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk 空欄 hint なし` })
  }

  // 2. 空行のみ hint
  if (
    /pendingTitleCount === 0\s*\n?\s*\?\s*'子タスクを改行区切りで bulk 追加 \(現在 空行のみで追加対象なし\)'/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `subtasks-bulk 空行のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk 空行のみ hint なし` })
  }

  // 3. 通常 (件数 expose) hint
  if (
    /:\s*`子タスクを改行区切りで bulk 追加 \(現在 \$\{pendingTitleCount\} 件、Cmd\/Ctrl\+Enter で追加\)`/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `subtasks-bulk 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk 通常 hint なし` })
  }

  // 4. iter650 invariant: tag-picker option 維持
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (/checked\s*\n?\s*\?\s*`タグ「\$\{t\.name\}」を付与中 \(クリックで解除\)`/.test(tp)) {
    findings.push({ level: 'info', message: `iter650 invariant: tag-picker 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter650 invariant: 破壊` })
  }

  // 5. iter649 invariant: assignee-picker member 維持
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/checked\s*\n?\s*\?\s*`「\$\{label\}」をアサイン中 \(クリックで解除\)`/.test(ap)) {
    findings.push({ level: 'info', message: `iter649 invariant: assignee-picker 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter649 invariant: 破壊` })
  }

  // 6. iter648 invariant: sprint-create-start 維持
  const spr = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (/startDate === ''\s*\n?\s*\?\s*'Sprint 開始日 \(必須、終了日以前\)'/.test(spr)) {
    findings.push({ level: 'info', message: `iter648 invariant: sprint-create-start 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter648 invariant: 破壊` })
  }

  console.log(`\n=== Findings (subtasks-bulk-aria-iter651) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
