/**
 * Phase 6.15 loop iter 700 (mode-D Desktop a11y) —
 * template-items-editor ul (Template 子 Item 一覧) に aria-label 追加
 * (iter699 list 命名 sweep の続き)。
 *
 * 課題: template-items-editor.tsx 行 204 の `<ul>` (Template 子 Item 一覧) は aria-label 無し。
 *   SR が「リスト N 項目」とだけ announce、context 不明。
 *
 * fix (1 ファイル ~1 行差分):
 *   - ul に `aria-label={`Template 子 Item 一覧 ${items.data!.length} 件`}`
 *
 * 検証: source-side regex assert + iter515-699 invariant cross-check。
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

  // 1. template-items ul aria-label
  if (
    /<ul className="divide-y text-sm" aria-label=\{`Template 子 Item 一覧 \$\{items\.data!\.length\} 件`\}>/.test(
      tie,
    )
  ) {
    findings.push({ level: 'info', message: `template-items ul aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `template-items ul aria-label なし` })
  }

  // 2. iter699 invariant: goals-list aria-label 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="goals-list"\s*\n\s*aria-label=\{`Goal 一覧 \$\{list\.data\.length\} 件`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter699 invariant: goals-list 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter699 invariant: 破壊` })
  }

  // 3. iter698 invariant: period-items 維持
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

  // 4. iter694 invariant: gantt critical chip 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/data-testid="gantt-summary-critical"/.test(gv)) {
    findings.push({ level: 'info', message: `iter694 invariant: gantt-summary-critical 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter694 invariant: 破壊` })
  }

  // 5. iter666 invariant: swimlane-empty 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="sprint-swimlane-empty"/.test(ssd)
  ) {
    findings.push({ level: 'info', message: `iter666 invariant: swimlane-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter666 invariant: 破壊` })
  }

  console.log(`\n=== Findings (template-items-list-aria-iter700) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
