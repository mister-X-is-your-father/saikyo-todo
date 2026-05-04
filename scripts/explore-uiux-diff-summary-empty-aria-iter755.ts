/**
 * Phase 6.15 loop iter 755 (mode-D Desktop a11y) —
 * diff-summary-bar の empty state div に role="status" + aria-live="polite" を追加。
 *
 * 課題: diff-summary-bar.tsx 行 61-66 の empty state は plain `<div>` で role/aria-live なし。
 *   Calendar / Schedule view で 想定 / 実測 が両方未登録の状態から動的に登録される時、
 *   SR ユーザは「想定 / 実測 が登録されると、ここに差分が並びます」 が announce されないので
 *   「何故 diff bar が空なのか」 が分からない。iter752 backlog-view empty state と同 pattern。
 *
 * fix (1 ファイル ~1 行差分):
 *   - empty state div に `role="status"` + `aria-live="polite"` を追加
 *
 * 検証: source-side regex assert + iter735-753 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dsb = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/diff-summary-bar.tsx'),
    'utf8',
  )
  const hasStatus =
    /<div className="text-muted-foreground py-2 text-xs" role="status" aria-live="polite">/.test(
      dsb,
    )
  if (hasStatus) {
    findings.push({
      level: 'info',
      message: `diff-summary-bar empty state div role/aria-live 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `diff-summary-bar empty state div role/aria-live 追加 不完全`,
    })
  }

  // iter752 invariant: backlog-view empty state td role/aria-live
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state aria-live 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
  }

  // iter748 invariant: gantt-view summary aria-label
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`critical path \$\{criticalCount\} 件 \(project 全体期間に直接影響、遅延すると全体遅延\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter748 invariant: gantt critical aria-label 維持 OK`,
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

  console.log(`\n=== Findings (diff-summary-empty-aria-iter755) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
