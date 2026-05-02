/**
 * Phase 6.15 loop iter 610 (mode-D Desktop a11y) —
 * item-edit-dialog editTitle IMEInput aria-label を 4-state 動的化
 * (空欄 / 空白のみ / 通常 / 上限近接、文字数 + 空白 unique で expose)。
 *
 * 課題: item-edit-dialog.tsx 行 480-493 の editTitle IMEInput は <Label htmlFor>
 *   のみで文字数 / 上限が aria 側で expose されない。aria-invalid 付き (空白のみ
 *   は invalid) だが「invalid だけ」 で「現在何文字、何が問題か」 が伝わらない。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 4-state 動的化:
 *     - 空欄: 'タイトル (必須、最大 500 文字)'
 *     - 空白のみ: `タイトル (現在 ${length} / 500 文字、空白のみは不正)`
 *     - 通常: `タイトル (現在 ${length} / 500 文字)`
 *     - 上限近接 (>480): `タイトル (現在 ${length} / 500 文字、上限近接)`
 *
 * iter609 editDescription pattern を editTitle に拡張 + 空白のみ case を追加 (required field 特有)。
 *
 * 検証: source-side regex assert + iter515-609 invariant cross-check。
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
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `editTitle 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editTitle 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /title\.trim\(\) === ''\s*\n?\s*\?\s*`タイトル \(現在 \$\{title\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editTitle 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editTitle 空白のみ hint なし` })
  }

  // 3. 上限近接 hint
  if (
    /title\.length > 480\s*\n?\s*\?\s*`タイトル \(現在 \$\{title\.length\} \/ 500 文字、上限近接\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editTitle 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editTitle 上限近接 hint なし` })
  }

  // 4. 通常 hint
  if (/:\s*`タイトル \(現在 \$\{title\.length\} \/ 500 文字\)`/.test(ied)) {
    findings.push({ level: 'info', message: `editTitle 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editTitle 通常 hint なし` })
  }

  // 5. iter609 invariant: editDescription aria-label 維持
  if (
    /description\.length === 0\s*\n?\s*\?\s*'説明 \(任意、最大 10000 文字、Markdown 可\)'/.test(ied)
  ) {
    findings.push({ level: 'info', message: `iter609 invariant: editDescription 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter609 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-edit-title-aria-iter610) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
