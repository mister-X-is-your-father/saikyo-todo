/**
 * Phase 6.15 loop iter 900 (mode-D Desktop a11y) — milestone 100 iter
 *
 * today-view の dueDate row span 内 visible "期限 " + <time> を nested aria-hidden span
 * で wrap、parent span aria-label "期限 ${dueDate}" 単独経路に統一。
 *
 * 経緯: iter897-899 <time> aria-hidden の続編。today-view の dueDate row も同 pattern
 *   (parent span に aria-label、内側 visible "期限 ${formatFriendlyDate(dueDate)}" あり)。
 *
 * 修正: visible "期限 " + <time>...</time> 全体を <span aria-hidden="true"> で wrap、
 *   parent span aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-899 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  // 1. nested aria-hidden span を含む期限 row
  if (
    /<span className="text-red-600" aria-label=\{`期限 \$\{it\.dueDate\}`\}>\s*<span aria-hidden="true">[\s\S]+?<time dateTime=\{it\.dueDate\}>[\s\S]+?<\/time>[\s\S]+?<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `today-view 期限 row 内 visible nested aria-hidden span OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view 期限 row 内 visible aria-hidden 未統合`,
    })
  }

  // 2. parent span aria-label 維持
  if (/aria-label=\{`期限 \$\{it\.dueDate\}`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `today-view 期限 parent span aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-view 期限 parent span aria-label 破壊`,
    })
  }

  // iter899 invariant
  const cp = readFileSync(
    resolve(process.cwd(), 'src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (
    /<time[\s\S]+?aria-label=\{`期限 \$\{item\.dueDate\}`\}[\s\S]+?>\s*<span aria-hidden="true">\{formatFriendlyDate\(item\.dueDate, today\)\}<\/span>/.test(
      cp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter899 invariant: command-palette due time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter899 invariant: 破壊` })
  }

  // iter862 invariant
  if (/<span aria-hidden="true">\{it\.title\}<\/span>/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: today-view title button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter825 invariant: today-view dueTime span aria-label
  if (/aria-label=\{`期限時刻 \$\{it\.dueTime\.slice\(0, 5\)\}`\}/.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter825 invariant: today-view dueTime aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter825 invariant: 破壊` })
  }

  // iter735 invariant
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

  console.log(`\n=== Findings (today-view-due-time-aria-hidden-iter900) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
