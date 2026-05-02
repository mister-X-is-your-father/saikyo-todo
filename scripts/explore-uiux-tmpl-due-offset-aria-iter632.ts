/**
 * Phase 6.15 loop iter 632 (mode-D Desktop a11y) —
 * template-items-editor dueOffset number input aria-label を 3-state IIFE 動的化
 * (26 input 統一達成、日数 expose + 範囲外 alert)。
 *
 * 課題: template-items-editor.tsx 行 116-127 の dueOffset input は aria-label が
 *   static "期日 offset (日数 — 展開日 + N 日後を期日に設定、0-365)" のみで
 *   current 値が aria 側で expose されない。
 *
 * fix (1 ファイル ~7 行差分、IIFE 3-state):
 *   - 空欄: '期日 offset (任意、日数 — 展開日 + N 日後を期日に設定、0-365)'
 *   - 範囲外: `期日 offset (有効範囲 0-365、現在値「${dueOffset}」 は範囲外)`
 *   - 有効: `期日 offset (現在 ${n} 日 — 展開日から ${n} 日後を期日に設定)`
 *
 * iter631 instantiate-var IIFE pattern を dueOffset に展開、saikyo-todo 内
 * 動的 aria-label が 26 input 統一達成。
 *
 * 検証: source-side regex assert + iter515-631 invariant cross-check。
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

  // 1. IIFE 動的化
  if (
    /aria-label=\{\(\(\) => \{\s*\n?\s*if \(dueOffset === ''\) return '期日 offset \(任意、日数 — 展開日 \+ N 日後を期日に設定、0-365\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `dueOffset IIFE 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `dueOffset IIFE 動的化なし` })
  }

  // 2. 範囲外 hint
  if (/return `期日 offset \(有効範囲 0-365、現在値「\$\{dueOffset\}」 は範囲外\)`/.test(tie)) {
    findings.push({ level: 'info', message: `dueOffset 範囲外 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dueOffset 範囲外 hint なし` })
  }

  // 3. 有効値 hint
  if (/return `期日 offset \(現在 \$\{n\} 日 — 展開日から \$\{n\} 日後を期日に設定\)`/.test(tie)) {
    findings.push({ level: 'info', message: `dueOffset 有効値 hint OK` })
  } else {
    findings.push({ level: 'warning', message: `dueOffset 有効値 hint なし` })
  }

  // 4. iter631 invariant: instantiate-var 維持
  const ifo = readFileSync(
    resolve(process.cwd(), 'src/components/template/instantiate-form.tsx'),
    'utf8',
  )
  if (/aria-label=\{\(\(\) => \{\s*\n?\s*const val = values\[v\] \?\? ''/.test(ifo)) {
    findings.push({ level: 'info', message: `iter631 invariant: instantiate-var 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter631 invariant: 破壊` })
  }

  // 5. iter630 invariant: tmpl-child-title 維持
  if (
    /title\.length === 0\s*\n?\s*\?\s*'子 Item のタイトル \(必須、最大 500 文字、Mustache 変数 \{\{var\}\} 利用可\)'/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `iter630 invariant: tmpl-child-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter630 invariant: 破壊` })
  }

  // 6. iter607 invariant: budget-warn percent expose 維持
  const bp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/budget-panel.tsx'),
    'utf8',
  )
  if (/:\s*`警告閾値 \(現在: \$\{Math\.round\(Number\(draftWarn\) \* 100\)\}%/.test(bp)) {
    findings.push({ level: 'info', message: `iter607 invariant: budget-warn 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter607 invariant: 破壊` })
  }

  console.log(`\n=== Findings (tmpl-due-offset-aria-iter632) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
