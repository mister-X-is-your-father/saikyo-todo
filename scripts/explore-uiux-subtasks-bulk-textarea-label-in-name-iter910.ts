/**
 * Phase 6.15 loop iter 910 (mode-D Desktop a11y) —
 * subtasks-panel subtasks-bulk Textarea aria-label を WCAG 2.5.3 (Label in Name)
 * 適合形に変更 (3 case 一括)。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx の subtasks-bulk Textarea は
 *   visible <Label> "改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)" を持つが、旧
 *   aria-label 3 case (empty / no-pending / has-pending) は visible の "(Cmd/Ctrl+Enter で追加)"
 *   が pending case で「(現在 N 件、Cmd/Ctrl+Enter で追加)」 として中間挿入される
 *   → contiguous substring 不適合。
 *
 * fix (1 ファイル / +3-3 行差分、3 case 一括):
 *   - aria-label を `改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加): {状態}` 形に統一し
 *     visible <Label> 全文を prefix に
 *
 * 検証: source-side regex assert + iter908/909 invariant cross-check。
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

  // 1. empty aria-label に visible prefix
  if (
    /'改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\): 子タスク bulk 追加用 textarea'/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk empty aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk empty aria-label 不含` })
  }

  // 2. no-pending aria-label
  if (
    /'改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\): 現在 空行のみで追加対象なし'/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk no-pending aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk no-pending aria-label 不含` })
  }

  // 3. has-pending aria-label
  if (
    /`改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\): 現在 \$\{pendingTitleCount\} 件 検出`/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk has-pending aria-label に visible prefix 含む OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk has-pending aria-label 不含` })
  }

  // 4. 旧 aria-label "子タスクを改行区切りで bulk 追加 (Cmd/Ctrl+Enter で追加)" 削除
  if (!/'子タスクを改行区切りで bulk 追加 \(Cmd\/Ctrl\+Enter で追加\)'/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-bulk 旧 aria-label 削除済 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `subtasks-bulk 旧 aria-label 残存` })
  }

  // iter909 invariant: p-desc aria-label
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /'説明 \(Cmd\/Ctrl\+Enter で保存\): 提案 description、任意、最大 10000 文字、Markdown 可'/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter909 invariant: p-desc aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter909 invariant: p-desc 破壊` })
  }

  console.log(`\n=== Findings (subtasks-bulk-textarea-label-in-name-iter910) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
