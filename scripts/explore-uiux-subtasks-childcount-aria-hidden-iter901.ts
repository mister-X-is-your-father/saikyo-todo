/**
 * Phase 6.15 loop iter 901 (mode-D Desktop a11y) —
 * subtasks-panel の childcount chip 内 visible "{N} 件" を aria-hidden span で wrap、
 * role="img" + aria-label "このタスクには子タスクが ${N} 件あります" 単独経路に統一。
 *
 * 経緯: iter875/893/896 (role="img" wrapper 内 visible aria-hidden) の続編。
 *   subtasks-panel header chip も同 pattern (role="img" + aria-label) だが visible
 *   "{N} 件" は aria-hidden 無し → SR が aria-label と visible を二重読み上げ。
 *
 * 修正: visible "{grandchildren.length} 件" を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-900 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // 1. childcount chip 内 visible aria-hidden
  if (/<span aria-hidden="true">\{grandchildren\.length\} 件<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `subtasks-panel childcount chip visible "{N} 件" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel childcount chip visible aria-hidden 未統合`,
    })
  }

  // 2. role="img" + aria-label 維持
  if (
    /role="img"[\s\S]+?aria-label=\{`このタスクには子タスクが \$\{grandchildren\.length\} 件あります`\}/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `subtasks-panel childcount chip role="img" + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `subtasks-panel childcount chip role/aria-label 破壊`,
    })
  }

  // 3. iter896 invariant: taskchute priority + ETA aria-hidden
  const tcv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">P\{item\.priority \?\? 4\}<\/span>/.test(tcv)) {
    findings.push({
      level: 'info',
      message: `iter896 invariant: taskchute priority chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter896 invariant: 破壊` })
  }

  // iter866 invariant: subtasks-panel bulk-add aria-hidden
  if (/<span aria-hidden="true">[\s\S]+?create\.isPending \? '追加中…'[\s\S]+?<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: subtasks-panel bulk-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
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

  console.log(`\n=== Findings (subtasks-childcount-aria-hidden-iter901) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
