/**
 * Phase 6.15 loop iter 619 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal description Textarea aria-label を 3-state 動的化
 * (10 input 統一達成、Markdown hint 追加)。
 *
 * 課題: decompose-proposals-panel.tsx 行 401-404 の proposal description Textarea は
 *   aria-label が static "提案 description (Cmd/Ctrl+Enter で保存)" のみで文字数が
 *   aria 側で expose されない。description は任意 (空白許容) なので 3-state で十分。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 3-state 動的化 (max 10000、空欄 hint に Markdown 可 hint 追加)
 *
 * iter618 team-context (3-state) pattern を proposal description に展開、
 * saikyo-todo 内 動的 aria-label が 10 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-618 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'提案 description \(任意、最大 10000 文字、Markdown 可、Cmd\/Ctrl\+Enter で保存\)'/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal-desc 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-desc 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /description\.length > 9500\s*\n?\s*\?\s*`提案 description \(現在 \$\{description\.length\} \/ 10000 文字、上限近接、Cmd\/Ctrl\+Enter で保存\)`/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal-desc 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-desc 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`提案 description \(現在 \$\{description\.length\} \/ 10000 文字、Cmd\/Ctrl\+Enter で保存\)`/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal-desc 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-desc 通常 hint なし` })
  }

  // 4. iter618 invariant: team-context 3-state 維持
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (
    /draft\.length === 0\s*\n?\s*\?\s*'チームコンテキスト \(workspace 全体、最大 4000 文字、AI プロンプト末尾に inject、Cmd\/Ctrl\+Enter で保存\)'/.test(
      tce,
    )
  ) {
    findings.push({ level: 'info', message: `iter618 invariant: team-context 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter618 invariant: 破壊` })
  }

  // 5. iter617 invariant: comment-edit 4-state 維持
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

  console.log(`\n=== Findings (proposal-desc-aria-iter619) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
