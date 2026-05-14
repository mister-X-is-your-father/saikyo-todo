/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y) —
 * top-items-by-time-chip 行内 2 visible (合計 label / entryCount 件) を
 * aria-hidden span で wrap.
 *
 * 課題: src/components/time-entry/top-items-by-time-chip.tsx 行 186-194 の 2 span は
 * 各々 aria-label "合計 {label}" / "{count} 件" を完全含むのに、内側 visible は
 * aria-hidden 無し → SR ユーザに重複読み上げ。iter844-877 sweep の続編で 2 callsite 一括対応。
 *
 * fix (1 ファイル ~2 行差分):
 *   - {label} (= 合計 minutes 表記) を <span aria-hidden="true"> で wrap
 *   - {row.entryCount} 件 を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-877 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ti = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  // 1. {label} aria-hidden span
  if (/<span aria-hidden="true">\{label\}<\/span>/.test(ti)) {
    findings.push({
      level: 'info',
      message: `top-items label visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `top-items label visible aria-hidden 未統合` })
  }

  // 2. {entryCount} 件 aria-hidden span
  if (/<span aria-hidden="true">\{row\.entryCount\} 件<\/span>/.test(ti)) {
    findings.push({
      level: 'info',
      message: `top-items entryCount visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `top-items entryCount aria-hidden 未統合` })
  }

  // 3. aria-label 維持
  if (
    /aria-label=\{`合計 \$\{label\}`\}/.test(ti) &&
    /aria-label=\{`\$\{row\.entryCount\} 件`\}/.test(ti)
  ) {
    findings.push({
      level: 'info',
      message: `top-items 2 aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `top-items aria-label regression` })
  }

  // 4. iter877 invariant: dashboard MUST title aria-hidden
  const dv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/dashboard-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(dv)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: dashboard MUST title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
  }

  // 5. iter735 invariant
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

  console.log(`\n=== Findings (top-items-by-time-aria-hidden-iter878) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
