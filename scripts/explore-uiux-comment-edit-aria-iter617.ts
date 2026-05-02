/**
 * Phase 6.15 loop iter 617 (mode-D Desktop a11y) —
 * comment-thread comment-edit Textarea aria-label を 4-state 動的化
 * (8 input 統一達成、Esc hint 維持)。
 *
 * 課題: comment-thread.tsx 行 226 の comment-edit Textarea は aria-label が
 *   static "コメント編集 (Cmd/Ctrl+Enter で保存、Esc で編集破棄)" のみで
 *   文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化 (max 10000、Esc hint も保持)
 *
 * iter616 comment-input pattern を comment-edit に展開、saikyo-todo 内
 * 4-state 動的 aria-label が 8 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-616 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /body\.length === 0\s*\n?\s*\?\s*'コメント編集 \(必須、最大 10000 文字、Cmd\/Ctrl\+Enter で保存、Esc で編集破棄\)'/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-edit 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-edit 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /body\.length > 9500\s*\n?\s*\?\s*`コメント編集 \(現在 \$\{body\.length\} \/ 10000 文字、上限近接、Cmd\/Ctrl\+Enter で保存、Esc で編集破棄\)`/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-edit 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-edit 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`コメント編集 \(現在 \$\{body\.length\} \/ 10000 文字、Cmd\/Ctrl\+Enter で保存、Esc で編集破棄\)`/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-edit 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-edit 通常 hint なし` })
  }

  // 4. iter616 invariant: comment-input 4-state 維持
  if (
    /body\.length === 0\s*\n?\s*\?\s*'コメント本文 \(必須、最大 10000 文字、@user で言及・通知、Cmd\/Ctrl\+Enter で投稿\)'/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `iter616 invariant: comment-input 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter616 invariant: 破壊` })
  }

  // 5. iter614 invariant: teDescription 4-state 維持
  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (
    /description\.length === 0\s*\n?\s*\?\s*'作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `iter614 invariant: teDescription 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter614 invariant: 破壊` })
  }

  // 6. iter610 invariant: editTitle 4-state 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter610 invariant: editTitle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter610 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-edit-aria-iter617) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
