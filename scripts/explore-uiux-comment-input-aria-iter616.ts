/**
 * Phase 6.15 loop iter 616 (mode-D Desktop a11y) —
 * comment-thread comment-input Textarea aria-label を 4-state 動的化
 * (7 input 統一達成、@user 言及 hint 維持)。
 *
 * 課題: comment-thread.tsx 行 99 の comment-input Textarea は aria-label が
 *   static "コメント本文 (Cmd/Ctrl+Enter で投稿)" のみで文字数 / 上限が aria 側で
 *   expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化:
 *     - 空欄: 'コメント本文 (必須、最大 10000 文字、@user で言及・通知、Cmd/Ctrl+Enter で投稿)'
 *     - 空白のみ: `コメント本文 (現在 ${length} / 10000 文字、空白のみは不正)`
 *     - 上限近接 (>9500): `コメント本文 (現在 ${length} / 10000 文字、上限近接、Cmd/Ctrl+Enter で投稿)`
 *     - 通常: `コメント本文 (現在 ${length} / 10000 文字、Cmd/Ctrl+Enter で投稿)`
 *
 * iter610-615 (4-state 文字数 expose) pattern を comment-input に展開、
 * saikyo-todo 内 4-state 動的 aria-label が 7 input 統一達成
 * (item.title / sprint.name / goal.title / kr.title / template.name /
 *  time-entry.description / comment.body)。
 *
 * 検証: source-side regex assert + iter515-615 invariant cross-check。
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
    /body\.length === 0\s*\n?\s*\?\s*'コメント本文 \(必須、最大 10000 文字、@user で言及・通知、Cmd\/Ctrl\+Enter で投稿\)'/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-input 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-input 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /body\.trim\(\) === ''\s*\n?\s*\?\s*`コメント本文 \(現在 \$\{body\.length\} \/ 10000 文字、空白のみは不正\)`/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-input 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-input 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /body\.length > 9500\s*\n?\s*\?\s*`コメント本文 \(現在 \$\{body\.length\} \/ 10000 文字、上限近接、Cmd\/Ctrl\+Enter で投稿\)`/.test(
      ct,
    )
  ) {
    findings.push({ level: 'info', message: `comment-input 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-input 上限近接 hint なし` })
  }

  // 4. 通常 hint
  if (
    /:\s*`コメント本文 \(現在 \$\{body\.length\} \/ 10000 文字、Cmd\/Ctrl\+Enter で投稿\)`/.test(ct)
  ) {
    findings.push({ level: 'info', message: `comment-input 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `comment-input 通常 hint なし` })
  }

  // 5. iter615 invariant: quick-add 上限近接 維持
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (
    /text\.length > 480\s*\n?\s*\?\s*`クイック追加 — タスクをすばやく作成 \(現在 \$\{text\.length\}/.test(
      qa,
    )
  ) {
    findings.push({ level: 'info', message: `iter615 invariant: quick-add 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter615 invariant: 破壊` })
  }

  // 6. iter614 invariant: teDescription 4-state 維持
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

  console.log(`\n=== Findings (comment-input-aria-iter616) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
