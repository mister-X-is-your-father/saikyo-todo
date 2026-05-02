/**
 * Phase 6.15 loop iter 633 (mode-D Desktop a11y) —
 * template-items-editor DoD Textarea aria-label を 3-state 動的化 + aria-invalid 追加
 * (27 input 統一達成、MUST 完了条件指針 hint)。
 *
 * 課題: template-items-editor.tsx 行 159-167 の DoD Textarea は aria-label が
 *   static "DoD (Definition of Done) — MUST item の完了条件" のみで文字数が
 *   aria 側で expose されない + aria-invalid 未対応。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 3-state 動的化 + aria-invalid 追加
 *   - 空欄: 「何があれば完了とみなすか」 指針
 *
 * iter632 dueOffset pattern を DoD に展開、saikyo-todo 内 動的 aria-label が
 * 27 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-632 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )

  // 1. 空欄 hint
  if (
    /dod\.length === 0\s*\n?\s*\?\s*'DoD \(Definition of Done\) — MUST item の完了条件 \(必須、何があれば完了とみなすか\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `dod 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dod 空欄 hint なし` })
  }

  // 2. 空白のみ hint
  if (
    /dod\.trim\(\) === ''\s*\n?\s*\?\s*`DoD \(現在 \$\{dod\.length\} 文字、空白のみは不正、MUST item には完了条件が必須\)`/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `dod 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dod 空白のみ hint なし` })
  }

  // 3. 通常 hint
  if (/:\s*`DoD \(現在 \$\{dod\.length\} 文字、Definition of Done\)`/.test(tie)) {
    findings.push({ level: 'info', message: `dod 通常 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dod 通常 hint なし` })
  }

  // 4. aria-invalid 追加
  if (/aria-invalid=\{\(dod\.length > 0 && dod\.trim\(\) === ''\) \|\| undefined\}/.test(tie)) {
    findings.push({ level: 'info', message: `dod aria-invalid 追加 OK` })
  } else {
    findings.push({ level: 'warning', message: `dod aria-invalid 追加なし` })
  }

  // 5. iter632 invariant: dueOffset 維持 (lint reformat 許容)
  if (
    /if \(dueOffset === ''\)\s*\n?\s*return '期日 offset \(任意、日数 — 展開日 \+ N 日後を期日に設定、0-365\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter632 invariant: dueOffset 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter632 invariant: 破壊` })
  }

  // 6. iter630 invariant: tmpl-child-title 維持
  if (
    /title\.length === 0\s*\n?\s*\?\s*'子 Item のタイトル \(必須、最大 500 文字、Mustache 変数 \{\{var\}\} 利用可\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter630 invariant: tmpl-child-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter630 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-dod-aria-iter633) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
