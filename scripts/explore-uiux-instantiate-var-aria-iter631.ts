/**
 * Phase 6.15 loop iter 631 (mode-D Desktop a11y) —
 * instantiate-form Mustache variable IMEInput aria-label を 4-state 動的化
 * (25 input 統一達成、各変数別 hint)。
 *
 * 課題: instantiate-form.tsx 行 107-118 の variable IMEInput は aria-label が
 *   `Mustache 変数 ${v} の値` の static で文字数 / 上限が aria 側で expose されない。
 *
 * fix (1 ファイル ~10 行差分、IIFE で 4-state):
 *   - 空欄: `Mustache 変数「${v}」 の値 (必須、最大 500 文字、template の {{${v}}} に展開時 substitute される)`
 *   - 空白のみ / 上限近接 / 通常 — iter610-630 と同 pattern
 *
 * iter630 tmpl-child-title pattern を instantiate-form variable に展開、
 * saikyo-todo 内 動的 aria-label が 25 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-630 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ifo = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )

  // 1. IIFE で動的化
  if (/aria-label=\{\(\(\) => \{\s*\n?\s*const val = values\[v\] \?\? ''/.test(ifo)) {
    findings.push({ level: 'info', message: `instantiate-var IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `instantiate-var IIFE 動的化なし` })
  }

  // 2. 空欄 hint
  if (
    /val\.length === 0\)\s*\n?\s*return `Mustache 変数「\$\{v\}」 の値 \(必須、最大 500 文字、template の \{\{\$\{v\}\}\} に展開時 substitute される\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `instantiate-var 空欄 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `instantiate-var 空欄 hint なし` })
  }

  // 3. 空白のみ hint
  if (
    /val\.trim\(\) === ''\)\s*\n?\s*return `Mustache 変数「\$\{v\}」 \(現在 \$\{val\.length\} \/ 500 文字、空白のみは不正\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `instantiate-var 空白のみ hint OK` })
  } else {
    findings.push({ level: 'warning', message: `instantiate-var 空白のみ hint なし` })
  }

  // 4. 上限近接 hint
  if (
    /val\.length > 480\)\s*\n?\s*return `Mustache 変数「\$\{v\}」 \(現在 \$\{val\.length\} \/ 500 文字、上限近接\)`/.test(
      ifo,
    )
  ) {
    findings.push({ level: 'info', message: `instantiate-var 上限近接 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `instantiate-var 上限近接 hint なし` })
  }

  // 5. iter630 invariant: tmpl-child-title 維持
  const tie = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (
    /title\.length === 0\s*\n?\s*\?\s*'子 Item のタイトル \(必須、最大 500 文字、Mustache 変数 \{\{var\}\} 利用可\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter630 invariant: tmpl-child-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter630 invariant: 破壊` })
  }

  // 6. iter629 invariant: tmpl-cron 維持
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /scheduleCron\.length === 0\s*\n?\s*\?\s*'cron 式 \(任意、5 フィールド標準 cron 形式 — 例: 「0 9 \* \* 1」 で毎週月曜 09:00\)'/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `iter629 invariant: tmpl-cron 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter629 invariant: 破壊` })
  }

  console.log(`\n=== Findings (instantiate-var-aria-iter631) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
