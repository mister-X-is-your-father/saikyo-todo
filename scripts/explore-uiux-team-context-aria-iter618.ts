/**
 * Phase 6.15 loop iter 618 (mode-D Desktop a11y) —
 * team-context-editor Textarea aria-label を 3-state 動的化
 * (空欄 / 通常 / 上限近接、9 input 統一達成、AI prompt inject 効果も hint)。
 *
 * 課題: team-context-editor.tsx 行 124-128 の team-context-textarea は aria-label
 *   が static "チームコンテキスト (workspace 全体、Cmd/Ctrl+Enter で保存)" のみ。
 *   visible に「N / 4000 文字」 counter は表示されてるが、SR には文字数進行が
 *   伝わらない。空白のみ check は不要 (空 OK の任意 field 扱い)。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 3-state 動的化:
 *     - 空欄: 'チームコンテキスト (workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd/Ctrl+Enter で保存)'
 *     - 上限近接 (>3800): `チームコンテキスト (現在 ${length} / 4000 文字、上限近接、Cmd/Ctrl+Enter で保存)`
 *     - 通常: `チームコンテキスト (現在 ${length} / 4000 文字、Cmd/Ctrl+Enter で保存)`
 *
 * iter617 comment-edit (4-state) pattern を team-context (3-state、空白許容) に展開、
 * saikyo-todo 内 動的 aria-label が 9 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-617 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /draft\.length === 0\s*\n?\s*\?\s*'チームコンテキスト \(workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd\/Ctrl\+Enter で保存\)'/.test(
      tce,
    )
  ) {
    findings.push({ level: 'info', message: `team-context 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `team-context 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /draft\.length > 3800\s*\n?\s*\?\s*`チームコンテキスト \(現在 \$\{draft\.length\} \/ 4000 文字、上限近接、Cmd\/Ctrl\+Enter で保存\)`/.test(
      tce,
    )
  ) {
    findings.push({ level: 'info', message: `team-context 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `team-context 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`チームコンテキスト \(現在 \$\{draft\.length\} \/ 4000 文字、Cmd\/Ctrl\+Enter で保存\)`/.test(
      tce,
    )
  ) {
    findings.push({ level: 'info', message: `team-context 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `team-context 通常 hint なし` })
  }

  // 4. iter617 invariant: comment-edit 4-state 維持
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (
    /body\.length === 0\s*\n?\s*\?\s*'コメント編集 \(必須、最大 10000 文字、Cmd\/Ctrl\+Enter で保存、Esc で編集破棄\)'/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `iter617 invariant: comment-edit 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter617 invariant: 破壊` })
  }

  // 5. iter616 invariant: comment-input 4-state 維持
  if (
    /body\.length === 0\s*\n?\s*\?\s*'コメント本文 \(必須、最大 10000 文字、@user で言及・通知、Cmd\/Ctrl\+Enter で投稿\)'/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `iter616 invariant: comment-input 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter616 invariant: 破壊` })
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

  console.log(`\n=== Findings (team-context-aria-iter618) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
