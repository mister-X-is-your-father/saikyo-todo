/**
 * Phase 6.15 loop iter 879 (mode-D Desktop a11y) —
 * estimate-bias-insight tendency chip visible {label} を aria-hidden span で wrap.
 *
 * 課題: src/components/time-entry/estimate-bias-insight.tsx 行 112-118 の tendency chip は
 * aria-label "傾向: {label}" を含むのに、内側 visible {label} は aria-hidden 無し →
 * SR ユーザに重複読み上げ。iter844-878 sweep の続編で 1 callsite 対応。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible {label} を <span aria-hidden="true"> で wrap
 *   - aria-label / data-testid / tone class 維持
 *
 * 検証: source-side regex assert + iter735-878 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const eb = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  // 1. tendency chip visible aria-hidden span
  if (/<span aria-hidden="true">\{label\}<\/span>/.test(eb)) {
    findings.push({
      level: 'info',
      message: `estimate-bias-tendency visible {label} aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias-tendency visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 維持
  if (/aria-label=\{`傾向: \$\{label\}`\}/.test(eb)) {
    findings.push({
      level: 'info',
      message: `estimate-bias-tendency aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `estimate-bias-tendency aria-label regression` })
  }

  // 3. iter878 invariant: top-items-by-time 2 aria-hidden
  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{label\}<\/span>/.test(ti) &&
    /<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `iter878 invariant: top-items aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter878 invariant: 破壊` })
  }

  // 4. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (estimate-bias-tendency-aria-hidden-iter879) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
