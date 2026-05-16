/**
 * Phase 6.15 loop iter 899 (mode-D Desktop a11y) —
 * command-palette の Item due <time> 内 visible に aria-hidden span 追加、
 * aria-label "期限 ${dueDate}" 単独経路に統一。
 *
 * 経緯: iter897/898 の <time> aria-hidden の続編。command-palette でも同 pattern。
 *
 * 修正: visible {formatFriendlyDate(item.dueDate, today)} を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-898 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cp = readFileSync(
    resolve(process.cwd(), 'src/components/shared/command-palette.tsx'),
    'utf8',
  )

  // 1. command-palette due <time> 内 visible aria-hidden
  if (
    /<time[\s\S]+?aria-label=\{`期限 \$\{item\.dueDate\}`\}[\s\S]+?>\s*<span aria-hidden="true">\{formatFriendlyDate\(item\.dueDate, today\)\}<\/span>/.test(
      cp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `command-palette due <time> visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `command-palette due <time> visible aria-hidden 未統合`,
    })
  }

  // 2. dateTime + aria-label 維持
  if (
    /dateTime=\{item\.dueDate\}/.test(cp) &&
    /aria-label=\{`期限 \$\{item\.dueDate\}`\}/.test(cp)
  ) {
    findings.push({
      level: 'info',
      message: `command-palette due <time> dateTime + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `command-palette due <time> attr 破壊`,
    })
  }

  // iter898 invariant: backlog 2 time aria-hidden
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (
    /<time dateTime=\{v\} aria-label=\{`期限 \$\{v\}`\}>\s*<span aria-hidden="true">\{formatFriendlyDate\(v, today\)\}<\/span>/.test(
      bv,
    ) &&
    /<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>\s*<span aria-hidden="true">\{display\}<\/span>/.test(
      bv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter898 invariant: backlog 2 <time> aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter898 invariant: 破壊` })
  }

  // iter897 invariant
  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (
    /<time[\s\S]+?aria-label=\{`期限 \$\{it\.dueDate\}`\}[\s\S]+?>\s*<span aria-hidden="true">\{it\.dueDate\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter897 invariant: personal-period due time aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter897 invariant: 破壊` })
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

  console.log(`\n=== Findings (command-palette-due-time-aria-hidden-iter899) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
