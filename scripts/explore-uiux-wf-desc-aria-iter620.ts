/**
 * Phase 6.15 loop iter 620 (mode-D Desktop a11y) —
 * workflows-panel wf-desc Textarea aria-label を 3-state 動的化
 * (11 input 統一達成)。
 *
 * 課題: workflows-panel.tsx 行 137-139 の wf-desc Textarea は aria-label が
 *   static "Workflow の説明 (任意、Cmd/Ctrl+Enter で作成)" のみで文字数 / 上限が
 *   aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分):
 *   - aria-label 3-state 動的化 (max 2000):
 *     - 空欄: 'Workflow の説明 (任意、最大 2000 文字、Cmd/Ctrl+Enter で作成)'
 *     - 上限近接 (>1900): `Workflow の説明 (現在 ${length} / 2000 文字、上限近接、Cmd/Ctrl+Enter で作成)`
 *     - 通常: `Workflow の説明 (現在 ${length} / 2000 文字、Cmd/Ctrl+Enter で作成)`
 *
 * iter619 proposal-desc (3-state) pattern を wf-desc に展開、saikyo-todo 内
 * 動的 aria-label が 11 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-619 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Workflow の説明 \(任意、最大 2000 文字、Cmd\/Ctrl\+Enter で作成\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-desc 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-desc 空欄 hint なし` })
  }

  // 2. 上限近接 hint
  if (
    /description\.length > 1900\s*\n?\s*\?\s*`Workflow の説明 \(現在 \$\{description\.length\} \/ 2000 文字、上限近接、Cmd\/Ctrl\+Enter で作成\)`/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-desc 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-desc 上限近接 hint なし` })
  }

  // 3. 通常 hint
  if (
    /:\s*`Workflow の説明 \(現在 \$\{description\.length\} \/ 2000 文字、Cmd\/Ctrl\+Enter で作成\)`/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-desc 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-desc 通常 hint なし` })
  }

  // 4. iter619 invariant: proposal-desc 3-state 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /description\.length === 0\s*\n?\s*\?\s*'提案 description \(任意、最大 10000 文字、Markdown 可、Cmd\/Ctrl\+Enter で保存\)'/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `iter619 invariant: proposal-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter619 invariant: 破壊` })
  }

  // 5. iter618 invariant: team-context 3-state 維持
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

  console.log(`\n=== Findings (wf-desc-aria-iter620) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
