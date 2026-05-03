/**
 * Phase 6.15 loop iter 699 (mode-D Desktop a11y) —
 * goals-list / krs-{goalId} / templates-list `<ul>` 3 箇所に aria-label 追加
 * (iter697 / iter698 の list 命名 sweep 続き)。
 *
 * 課題:
 *   - goals-panel.tsx 行 305 の `<ul data-testid="goals-list">` は aria-label 無し
 *   - goals-panel.tsx 行 660 の `<ul data-testid="krs-${goalId}">` は aria-label 無し
 *   - templates-panel.tsx 行 255 の `<ul>` (template list) は aria-label 無し
 *
 * fix (2 ファイル ~7 行差分):
 *   - 各 ul に件数込みの descriptive aria-label
 *
 * 検証: source-side regex assert + iter515-698 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )

  // 1. goals-list ul aria-label
  if (
    /data-testid="goals-list"\s*\n\s*aria-label=\{`Goal 一覧 \$\{list\.data\.length\} 件`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `goals-list aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `goals-list aria-label なし` })
  }

  // 2. krs ul aria-label
  if (
    /data-testid=\{`krs-\$\{goalId\}`\}\s*\n\s*aria-label=\{`Key Result 一覧 \$\{\(list\.data \?\? \[\]\)\.length\} 件`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `krs ul aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `krs ul aria-label なし` })
  }

  // 3. templates ul aria-label
  if (
    /<ul className="space-y-3" aria-label=\{`Template 一覧 \$\{list\.data!\.length\} 件`\}>/.test(
      tp,
    )
  ) {
    findings.push({ level: 'info', message: `templates ul aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `templates ul aria-label なし` })
  }

  // 4. iter698 invariant: period-items ul 維持
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`\$\{periodLabelJa\(period\)\} 期間の Item 一覧 \$\{filtered\.length\} 件`\}/.test(
      ppv,
    )
  ) {
    findings.push({ level: 'info', message: `iter698 invariant: period-items 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter698 invariant: 破壊` })
  }

  // 5. iter697 invariant: keybindings dl 維持
  const km = readFileSync(
    resolve(process.cwd(), 'src/components/shared/keybindings-help-modal.tsx'),
    'utf8',
  )
  if (/aria-labelledby=\{headingId\}/.test(km)) {
    findings.push({ level: 'info', message: `iter697 invariant: keybindings dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter697 invariant: 破壊` })
  }

  console.log(`\n=== Findings (list-aria-iter699) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
