/**
 * Phase 6.15 loop iter 624 (mode-D Desktop a11y) —
 * decompose-proposals-panel proposal title IMEInput aria-label を 4-state 動的化
 * (15 input 統一達成)。
 *
 * 課題: decompose-proposals-panel.tsx 行 369-379 の p-title IMEInput は
 *   <Label htmlFor> のみで文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化 (max 500、aria-invalid 既存)
 *
 * iter623 src-name pattern を proposal title に展開、saikyo-todo 内 動的
 * aria-label が 15 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-623 invariant cross-check。
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
  if (/title\.length === 0\s*\n?\s*\?\s*'提案タイトル \(必須、最大 500 文字\)'/.test(dpp)) {
    findings.push({ level: 'info', message: `proposal-title 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-title 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /title\.trim\(\) === ''\s*\n?\s*\?\s*`提案タイトル \(現在 \$\{title\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal-title 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-title 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /title\.length > 480\s*\n?\s*\?\s*`提案タイトル \(現在 \$\{title\.length\} \/ 500 文字、上限近接\)`/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `proposal-title 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `proposal-title 上限近接 hint なし` })
  }

  // 4. iter623 invariant: src-name 4-state 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Source 名前 \(必須、最大 200 文字、識別しやすい名前 — 例: Yamory チーム A\)'/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter623 invariant: src-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter623 invariant: 破壊` })
  }

  // 5. iter622 invariant: wf-name 4-state 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Workflow 名前 \(必須、最大 200 文字、何を自動化するか分かる名前\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter622 invariant: wf-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter622 invariant: 破壊` })
  }

  // 6. iter619 invariant: proposal-desc 3-state 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'提案 description \(任意、最大 10000 文字、Markdown 可、Cmd\/Ctrl\+Enter で保存\)'/.test(
      dpp,
    )
  ) {
    findings.push({ level: 'info', message: `iter619 invariant: proposal-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter619 invariant: 破壊` })
  }

  console.log(`\n=== Findings (proposal-title-aria-iter624) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
