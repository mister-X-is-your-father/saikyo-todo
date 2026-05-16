/**
 * Phase 6.15 loop iter 897 (mode-D Desktop a11y) —
 * personal-period-view の due <time> 内 visible {it.dueDate} に aria-hidden span 追加、
 * <time> aria-label "期限 ${dueDate}" 単独経路に統一。
 *
 * 経緯: iter876 notification-bell <time> aria-label + 内側 span aria-hidden の続編。
 *   personal-period-view の due time も同 pattern (aria-label "期限 ${dueDate}") だが
 *   内側 visible {it.dueDate} は aria-hidden 無し → SR が aria-label と visible を
 *   二重読み上げ。
 *
 * 修正: visible {it.dueDate} を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-896 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ppv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )

  // 1. <time> 内 visible {it.dueDate} aria-hidden span
  if (
    /<time[\s\S]+?aria-label=\{`期限 \$\{it\.dueDate\}`\}[\s\S]+?>\s*<span aria-hidden="true">\{it\.dueDate\}<\/span>/.test(
      ppv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `personal-period-view due <time> visible {it.dueDate} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view due <time> visible aria-hidden 未統合`,
    })
  }

  // 2. dateTime + aria-label 維持
  if (/dateTime=\{it\.dueDate\}/.test(ppv) && /aria-label=\{`期限 \$\{it\.dueDate\}`\}/.test(ppv)) {
    findings.push({
      level: 'info',
      message: `personal-period-view due <time> dateTime + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `personal-period-view due <time> attr 破壊`,
    })
  }

  // 3. iter896 invariant
  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">P\{item\.priority \?\? 4\}<\/span>/.test(tcv) &&
    /<span aria-hidden="true">→\{tickerRow\.eta\}<\/span>/.test(tcv)
  ) {
    findings.push({
      level: 'info',
      message: `iter896 invariant: taskchute priority + ETA aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter896 invariant: 破壊` })
  }

  // iter894 invariant
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (
    /<span\s+className="truncate text-left font-medium"[\s\S]+?aria-hidden="true"[\s\S]+?>\s*\{it\.title\}\s*<\/span>/.test(
      iv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter894 invariant: inbox-view title aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter894 invariant: 破壊` })
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

  console.log(`\n=== Findings (personal-period-due-time-aria-hidden-iter897) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
