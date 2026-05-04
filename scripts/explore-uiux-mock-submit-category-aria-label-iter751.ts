/**
 * Phase 6.15 loop iter 751 (mode-D Desktop a11y) —
 * mock-submit-form の カテゴリ select に aria-label を追加して現在値を含める。
 *
 * 課題: mock-submit-form.tsx 行 83-95 の select は Label htmlFor で関連付けはされているが、
 *   aria-label による「現在何が選ばれているか」 の context が無い。create-time-entry-form
 *   line 91-105 の select は `aria-label={`カテゴリ (現在: ${...})`}` を持っており非対称。
 *   SR ユーザは select に focus 時に「カテゴリ」とだけ聞こえ、現在値は option を 1 つずつ
 *   navigate しないと分からない (要 selection に至るまでの operation cost が高い)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - select に `aria-label={`カテゴリ (現在: ${... form.watch('category') ...})`}` を追加
 *
 * 検証: source-side regex assert + iter735-750 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )

  // 1. mock-submit-form select aria-label 追加
  const hasAriaLabel =
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === form\.watch\('category'\)\)\?\.label \?\? form\.watch\('category'\)\}\)`\}/.test(
      msf,
    )
  if (hasAriaLabel) {
    findings.push({
      level: 'info',
      message: `mock-submit-form select aria-label 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit-form select aria-label 追加 不完全`,
    })
  }

  // iter748 invariant: gantt-view summary critical/slip aria-label
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`critical path \$\{criticalCount\} 件 \(project 全体期間に直接影響、遅延すると全体遅延\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter748 invariant: gantt critical-path aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter748 invariant: 破壊` })
  }

  // iter746 invariant: schedule-item-picker
  const sip = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (/aria-keyshortcuts="Escape"/.test(sip)) {
    findings.push({
      level: 'info',
      message: `iter746 invariant: schedule-item-picker aria-keyshortcuts 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter746 invariant: 破壊` })
  }

  // iter743 invariant: quick-add IMEInput
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  const qaMatches = qa.match(/aria-keyshortcuts="Enter"/g) ?? []
  if (qaMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter743 invariant: quick-add aria-keyshortcuts 維持 OK (${qaMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter743 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (mock-submit-category-aria-label-iter751) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
