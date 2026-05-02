/**
 * Phase 6.15 loop iter 622 (mode-D Desktop a11y) —
 * workflows-panel wf-name IMEInput aria-label を 4-state 動的化 + aria-invalid 追加
 * (13 input 統一達成、whitespace-only check 追加)。
 *
 * 課題: workflows-panel.tsx 行 105-114 の wf-name IMEInput は <Label htmlFor> のみで
 *   文字数 / 上限が aria 側で expose されない。さらに aria-invalid (whitespace-only)
 *   check も未対応 (他の name input は付いている)。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label 4-state 動的化 (max 200、空欄 hint に「何を自動化するか分かる名前」)
 *   - aria-invalid={(name.length > 0 && name.trim() === '') || undefined} 追加
 *
 * iter610-621 (4-state 文字数 + aria-invalid whitespace) pattern を wf-name に展開、
 * saikyo-todo 内 動的 aria-label が 13 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-621 invariant cross-check。
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
    /name\.length === 0\s*\n?\s*\?\s*'Workflow 名前 \(必須、最大 200 文字、何を自動化するか分かる名前\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-name 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-name 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /name\.trim\(\) === ''\s*\n?\s*\?\s*`Workflow 名前 \(現在 \$\{name\.length\} \/ 200 文字、空白のみは不正\)`/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-name 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-name 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /name\.length > 180\s*\n?\s*\?\s*`Workflow 名前 \(現在 \$\{name\.length\} \/ 200 文字、上限近接\)`/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `wf-name 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-name 上限近接 hint なし` })
  }

  // 4. aria-invalid 追加
  if (/aria-invalid=\{\(name\.length > 0 && name\.trim\(\) === ''\) \|\| undefined\}/.test(wp)) {
    findings.push({ level: 'info', message: `wf-name aria-invalid 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-name aria-invalid 追加なし` })
  }

  // 5. iter621 invariant: tmpl-desc 2-state 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Template の説明 \(任意、このテンプレートが何を生成するか/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter621 invariant: tmpl-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter621 invariant: 破壊` })
  }

  // 6. iter620 invariant: wf-desc 3-state 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'Workflow の説明 \(任意、最大 2000 文字、Cmd\/Ctrl\+Enter で作成\)'/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter620 invariant: wf-desc 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter620 invariant: 破壊` })
  }

  console.log(`\n=== Findings (wf-name-aria-iter622) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
