/**
 * Phase 6.15 loop iter 609 (mode-D Desktop a11y) —
 * item-edit-dialog editDescription IMEInput aria-label を 3-state 動的化
 * (空欄 / 通常 / 上限近接、文字数 expose)。
 *
 * 課題: item-edit-dialog.tsx 行 495-502 の editDescription IMEInput は
 *   <Label htmlFor> による accessible name "説明" のみで、文字数制限 (10000)
 *   と現在文字数が aria 側で expose されない。長文 Markdown を貼って何文字目
 *   かを確認するには visible counter が必要だが現状なし。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 3-state 動的化:
 *     - 空欄: '説明 (任意、最大 10000 文字、Markdown 可)'
 *     - 通常: `説明 (現在 ${length} / 10000 文字)`
 *     - 上限近接 (>9500): `説明 (現在 ${length} / 10000 文字、上限近接)`
 *
 * iter587-608 (動的 aria-label expose) pattern を editDescription に水平展開、
 * SR ユーザは Tab focus / 入力中に文字数進行を 1 phrase で取得可能。
 *
 * 検証: source-side regex assert + iter515-608 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /description\.length === 0\s*\n?\s*\?\s*'説明 \(任意、最大 10000 文字、Markdown 可\)'/.test(ied)
  ) {
    findings.push({ level: 'info', message: `editDescription 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDescription 空欄 hint なし` })
  }

  // 2. 通常 hint
  if (/:\s*`説明 \(現在 \$\{description\.length\} \/ 10000 文字\)`/.test(ied)) {
    findings.push({ level: 'info', message: `editDescription 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDescription 通常 hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /description\.length > 9500\s*\n?\s*\?\s*`説明 \(現在 \$\{description\.length\} \/ 10000 文字、上限近接\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editDescription 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDescription 上限近接 hint なし` })
  }

  // 4. iter608 invariant: tmpl-kind aria-label 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Template 種別 \(現在: \$\{/.test(tp)) {
    findings.push({ level: 'info', message: `iter608 invariant: tmpl-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter608 invariant: 破壊` })
  }

  // 5. iter607 invariant: budget-warn percent expose 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/:\s*`警告閾値 \(現在: \$\{Math\.round\(Number\(draftWarn\) \* 100\)\}%/.test(bp)) {
    findings.push({ level: 'info', message: `iter607 invariant: budget-warn percent 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter607 invariant: 破壊` })
  }

  // 6. iter604 invariant: editKr aria-label 維持
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*const current = \(krsList\.data \?\? \[\]\)\.find\(/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `iter604 invariant: editKr 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter604 invariant: 破壊` })
  }

  console.log(`\n=== Findings (item-edit-desc-aria-iter609) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
