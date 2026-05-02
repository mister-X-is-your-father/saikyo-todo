/**
 * Phase 6.15 loop iter 621 (mode-D Desktop a11y) —
 * templates-panel tmpl-desc Textarea aria-label を 2-state 動的化
 * (12 input 統一達成、maxLength なしのため上限近接 hint なし)。
 *
 * 課題: templates-panel.tsx 行 159-161 の tmpl-desc Textarea は aria-label が
 *   static "Template の説明 (Cmd/Ctrl+Enter で作成)" のみで文字数が aria 側で
 *   expose されない。maxLength 設定なしのため上限 hint は不要、空欄 / 通常 の
 *   2-state で十分。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 2-state 動的化:
 *     - 空欄: 'Template の説明 (任意、このテンプレートが何を生成するか、Cmd/Ctrl+Enter で作成)'
 *     - 通常: `Template の説明 (現在 ${length} 文字、Cmd/Ctrl+Enter で作成)`
 *
 * iter620 wf-desc (3-state) pattern を tmpl-desc (2-state、maxLength なし) に展開、
 * saikyo-todo 内 動的 aria-label が 12 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-620 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. tmpl-desc 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Template の説明 \(任意、このテンプレートが何を生成するか、Cmd\/Ctrl\+Enter で作成\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-desc 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-desc 空欄 hint なし` })
  }

  // 2. tmpl-desc 通常 hint
  if (
    /:\s*`Template の説明 \(現在 \$\{description\.length\} 文字、Cmd\/Ctrl\+Enter で作成\)`/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `tmpl-desc 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `tmpl-desc 通常 hint なし` })
  }

  // 3. iter620 invariant: wf-desc 3-state 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Workflow の説明 \(任意、最大 2000 文字、Cmd\/Ctrl\+Enter で作成\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter620 invariant: wf-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter620 invariant: 破壊` })
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

  // 5. iter608 invariant: tmpl-kind 維持
  if (/aria-label=\{`Template 種別 \(現在: \$\{/.test(tp)) {
    findings.push({ level: 'info', message: `iter608 invariant: tmpl-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter608 invariant: 破壊` })
  }

  // 6. iter613 invariant: tmpl-name 4-state 維持
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter613 invariant: tmpl-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter613 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-desc-aria-iter621) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
