/**
 * Phase 6.15 loop iter 614 (mode-D Desktop a11y) —
 * create-time-entry-form teDescription IMEInput aria-label を 4-state 動的化
 * (6 input 統一達成、time-entry 領域も追従)。
 *
 * 課題: create-time-entry-form.tsx 行 102-112 の teDescription IMEInput は
 *   <Label htmlFor> のみで文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~9 行差分、max 500、空欄 hint に「何をやったかを 1 行で」 追加):
 *   - 空欄: '作業内容 (必須、最大 500 文字、何をやったかを 1 行で)'
 *   - 空白のみ / 上限近接 / 通常 — iter610-613 の 4-state pattern と同じ
 *
 * iter610-613 (4-state 動的 aria-label) pattern を teDescription に展開、
 * saikyo-todo 内 4-state 動的 aria-label が 6 input 統一達成 (item.title /
 * sprint.name / goal.title / kr.title / template.name / time-entry.description)。
 *
 * 検証: source-side regex assert + iter515-613 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ctef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. teDescription 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'作業内容 \(必須、最大 500 文字、何をやったかを 1 行で\)'/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDescription 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDescription 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /description\.trim\(\) === ''\s*\n?\s*\?\s*`作業内容 \(現在 \$\{description\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDescription 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDescription 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /description\.length > 480\s*\n?\s*\?\s*`作業内容 \(現在 \$\{description\.length\} \/ 500 文字、上限近接\)`/.test(
      ctef,
    )
  ) {
    findings.push({ level: 'info', message: `teDescription 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `teDescription 上限近接 hint なし` })
  }

  // 4. iter613 invariant: tmpl-name 4-state 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /name\.length === 0\s*\n?\s*\?\s*'Template 名前 \(必須、最大 200 文字、何を生成するかが分かる名前\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter613 invariant: tmpl-name 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter613 invariant: 破壊` })
  }

  // 5. iter612 invariant: goal-title 4-state 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /title\.length === 0\s*\n?\s*\?\s*'Goal Objective \(必須、最大 200 文字、なに \/ なぜを 1 行で\)'/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter612 invariant: goal-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter612 invariant: 破壊` })
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

  console.log(`\n=== Findings (te-desc-aria-iter614) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
