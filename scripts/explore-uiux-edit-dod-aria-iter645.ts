/**
 * Phase 6.15 loop iter 645 (mode-D Desktop a11y) —
 * item-edit-dialog editDod IMEInput aria-label を 3-state 動的化
 * (44 input 統一達成、MUST 必須注記)。
 *
 * 課題: item-edit-dialog.tsx 行 687-698 の editDod IMEInput は <Label htmlFor>
 *   のみで current 値 / MUST 必須性が aria 側で expose されない (visible
 *   editDod-hint で文字 hint はあるが、aria-describedby で連結のみ)。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 3-state 動的化:
 *     - 空欄: 'DoD 完了条件 (MUST item は必須、空欄では保存・done 遷移不可)'
 *     - 空白のみ + isMust: 「MUST 保存に不正」 alert
 *     - 通常: 文字数
 *
 * iter644 instantiate-override pattern を editDod に展開、saikyo-todo 内
 * 動的 aria-label が 44 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-644 invariant cross-check。
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
    /dod\.length === 0\s*\n?\s*\?\s*'DoD 完了条件 \(MUST item は必須、空欄では保存・done 遷移不可\)'/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editDod 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDod 空欄 hint なし` })
  }

  // 2. 空白のみ + isMust hint
  if (
    /isMust && dod\.trim\(\) === ''\s*\n?\s*\?\s*`DoD \(現在 \$\{dod\.length\} 文字、空白のみは MUST 保存に不正\)`/.test(
      ied,
    )
  ) {
    findings.push({ level: 'info', message: `editDod 空白のみ + MUST hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDod 空白のみ + MUST hint なし` })
  }

  // 3. 通常 hint
  if (/:\s*`DoD \(現在 \$\{dod\.length\} 文字、Definition of Done\)`/.test(ied)) {
    findings.push({ level: 'info', message: `editDod 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `editDod 通常 hint なし` })
  }

  // 4. iter644 invariant: instantiate-override 維持
  const ifo = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (
    /override\.length === 0\s*\n?\s*\?\s*`Template「\$\{template\.name\}」展開時の root Item タイトル \(任意、最大 500 文字、省略時は「\$\{template\.name\}」\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `iter644 invariant: instantiate-override 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter644 invariant: 破壊` })
  }

  // 5. iter610 invariant: editTitle 4-state 維持
  if (/title\.length === 0\s*\n?\s*\?\s*'タイトル \(必須、最大 500 文字\)'/.test(ied)) {
    findings.push({ level: 'info', message: `iter610 invariant: editTitle 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter610 invariant: 破壊` })
  }

  // 6. iter633 invariant: tmpl-dod 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (
    /dod\.length === 0\s*\n?\s*\?\s*'DoD \(Definition of Done\) — MUST item の完了条件 \(必須、何があれば完了とみなすか\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter633 invariant: tmpl-dod 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter633 invariant: 破壊` })
  }

  console.log(`\n=== Findings (edit-dod-aria-iter645) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
