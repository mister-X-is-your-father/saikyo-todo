/**
 * Phase 6.15 loop iter 615 (mode-D Desktop a11y) —
 * quick-add IMEInput aria-label を 2-state 動的化 (通常 / 上限近接、文字数 alert)。
 *
 * 課題: quick-add.tsx 行 134-140 の quick-add-input IMEInput は aria-label が
 *   static "クイック追加 — タスクをすばやく作成 (Enter で確定、自然言語で日時・
 *   優先度・タグ・見積時間を指定可)" で、長文を貼ったときに上限 500 文字に近接
 *   していることが SR に伝わらない。短い text で記述指針が必要なため通常時は
 *   既存 hint を維持し、>480 文字時のみ「上限近接」 を expose。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label 2-state 動的化:
 *     - 上限近接 (>480): `クイック追加 — タスクをすばやく作成 (現在 ${length} / 500 文字、上限近接、Enter で確定)`
 *     - 通常: 既存 static "クイック追加 — タスクをすばやく作成 (Enter で確定、...)"
 *
 * iter610-614 (4-state 文字数 expose) pattern を quick-add に展開、ただし
 * 通常時は既存 rich description を維持 (記述指針が長文 hint を含むため)。
 *
 * 検証: source-side regex assert + iter515-614 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')

  // 1. 上限近接 hint
  if (
    /text\.length > 480\s*\n?\s*\?\s*`クイック追加 — タスクをすばやく作成 \(現在 \$\{text\.length\} \/ 500 文字、上限近接、Enter で確定\)`/.test(
      qa,
    )
  ) {
    findings.push({ level: 'info', message: `quick-add 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `quick-add 上限近接 hint なし` })
  }

  // 2. 通常 hint (既存 maintained)
  if (
    /:\s*'クイック追加 — タスクをすばやく作成 \(Enter で確定、自然言語で日時・優先度・タグ・見積時間を指定可\)'/.test(
      qa,
    )
  ) {
    findings.push({ level: 'info', message: `quick-add 通常 hint 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `quick-add 通常 hint なし` })
  }

  // 3. iter614 invariant: teDescription 4-state 維持
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

  // 5. iter610 invariant: editTitle 4-state 維持
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter610 invariant: editTitle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter610 invariant: 破壊` })
  }

  console.log(`\n=== Findings (quick-add-aria-iter615) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
