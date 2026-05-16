/**
 * Phase 6.15 loop iter 896 (mode-D Desktop a11y) —
 * taskchute-view の priority chip + ETA chip 内 visible text を aria-hidden 化、
 * role="img" / aria-label 単独経路に統一。
 *
 * 経緯: iter875/893 (role="img" wrapper 内 visible aria-hidden) の続編。
 *   taskchute-view の 2 chip:
 *     - priority chip (role="img" + aria-label "{label}") visible "P{N}" → 重複 risk
 *     - ETA chip (aria-label "予測完了時刻 ${eta}") visible "→${eta}" → 重複 risk
 *
 * 修正: 2 chip 内 visible を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-895 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )

  // 1. priority chip 内 visible "P{n}" aria-hidden
  if (/<span aria-hidden="true">P\{item\.priority \?\? 4\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view priority chip visible "P{n}" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view priority chip visible aria-hidden 未統合`,
    })
  }

  // 2. ETA chip 内 visible "→{eta}" aria-hidden
  if (/<span aria-hidden="true">→\{tickerRow\.eta\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view ETA chip visible "→{eta}" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view ETA chip visible aria-hidden 未統合`,
    })
  }

  // 3. role="img" + aria-label 維持 (priority chip)
  if (/role="img"[\s\S]+?aria-label=\{priorityLabel\(item\.priority\)\}/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `taskchute-view priority chip role="img" + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view priority chip role/aria-label 破壊`,
    })
  }

  // 4. ETA chip aria-label + data-testid 維持
  if (
    /aria-label=\{`予測完了時刻 \$\{tickerRow\.eta\}`\}/.test(tcv) &&
    /data-testid=\{`taskchute-eta-\$\{item\.id\}`\}/.test(tcv)
  ) {
    findings.push({
      level: 'info',
      message: `taskchute-view ETA chip aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view ETA chip aria-label / data-testid 破壊`,
    })
  }

  // iter895 invariant: workflow run duration aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span className="text-muted-foreground ml-auto tabular-nums" aria-hidden="true">\s*\{formatRunDuration\(r\)\}\s*<\/span>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter895 invariant: workflow run duration aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter895 invariant: 破壊` })
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

  console.log(`\n=== Findings (taskchute-priority-eta-aria-hidden-iter896) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
