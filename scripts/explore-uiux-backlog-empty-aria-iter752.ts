/**
 * Phase 6.15 loop iter 752 (mode-D Desktop a11y) —
 * backlog-view の empty state td に role="status" + aria-live="polite" を追加。
 *
 * 課題: backlog-view.tsx 行 376-382 の empty state は plain `<td>` で、SR は dynamic に
 *   filter / sort で 0 件になった瞬間を「表示する item がありません」 として announce
 *   しない。inbox-view / today-view の EmptyState は role="status" + aria-live="polite"
 *   を持つ pattern と非対称。filter chip 操作で表示が突然空になった時 SR ユーザは
 *   table が空になったことに気付きにくい。
 *
 * fix (1 ファイル ~3 行差分):
 *   - empty state td に `role="status"` + `aria-live="polite"` を追加
 *
 * 検証: source-side regex assert + iter735-751 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. backlog-view empty state td に role="status" + aria-live="polite"
  const hasStatus =
    /colSpan=\{columns\.length\}\s*\n\s*className="text-muted-foreground py-8 text-center"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(
      bv,
    )
  if (hasStatus) {
    findings.push({
      level: 'info',
      message: `backlog-view empty state td role/aria-live 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view empty state td role/aria-live 追加 不完全`,
    })
  }

  // iter751 race invariant: mock-submit-form select aria-label
  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`カテゴリ \(現在: \$\{TIME_ENTRY_CATEGORIES\.find\(\(c\) => c\.key === form\.watch\('category'\)\)\?\.label \?\? form\.watch\('category'\)\}\)`\}/.test(
      msf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter751-race invariant: mock-submit-form select aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter751-race invariant: 破壊` })
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

  console.log(`\n=== Findings (backlog-empty-aria-iter752) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
