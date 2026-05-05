/**
 * Phase 6.15 loop iter 810 (mode-D Desktop a11y) —
 * items-board filter-count span 内 visible text を aria-hidden で wrap
 * (parent span has aria-label, visible text is duplicate)。
 *
 * 課題: items-board.tsx 行 412-419 の filter-count span は parent span に role="status"
 *   + aria-live + aria-label が完全 content を含むのに、内側 visible text は
 *   aria-hidden 無し。SR ユーザは aria-label を聞いた後、内側の数値も再度読み上げ
 *   される重複。iter800-809 sweep の続編。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 内側 text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-809 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  const hasFilterCountAriaHidden =
    /data-testid="filter-count"\s*\n\s*>\s*\n\s*<span aria-hidden="true">\s*\n\s*\{filterActive \? `\$\{filtered\.length\} \/ \$\{totalActive\} 件`/.test(
      ib,
    )
  if (hasFilterCountAriaHidden) {
    findings.push({
      level: 'info',
      message: `items-board filter-count span 内 visible text aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter-count aria-hidden 不完全`,
    })
  }

  // iter809 invariant: operation-board forecast aria-hidden
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    /font-medium tabular-nums" aria-hidden="true"/.test(obw) &&
    /text-\[11px\] opacity-80" aria-hidden="true"/.test(obw) &&
    /ml-auto font-semibold" aria-hidden="true"/.test(obw)
  ) {
    findings.push({
      level: 'info',
      message: `iter809 invariant: operation-board forecast aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter809 invariant: 破壊` })
  }

  // iter808 invariant: notification-bell chip aria-hidden
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{hint\.label\}<\/span>/.test(nb) &&
    /<span aria-hidden="true">\{unreadBreakdown\}<\/span>/.test(nb)
  ) {
    findings.push({
      level: 'info',
      message: `iter808 invariant: notification-bell chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter808 invariant: 破壊` })
  }

  // iter798 invariant: items-board view switcher 6 main button aria-label
  if (
    /aria-label="Today \(今日のタスク優先順、scheduledFor=今日 \+ 期限近接\)"/.test(ib) &&
    /aria-label="Dashboard \(PDCA \/ 進捗 \/ 健全性 widget の集約画面\)"/.test(ib)
  ) {
    findings.push({
      level: 'info',
      message: `iter798 invariant: items-board view switcher aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter798 invariant: 破壊` })
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

  console.log(`\n=== Findings (filter-count-aria-hidden-iter810) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
