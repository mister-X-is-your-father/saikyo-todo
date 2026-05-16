/**
 * Phase 6.15 loop iter 902 (mode-D Desktop a11y) —
 * comment-thread の AI Agent badge 内 visible "AI" を aria-hidden span で wrap、
 * role="img" + aria-label "AI Agent による投稿" 単独経路に統一。
 *
 * 経緯: iter875/893/896/901 (role="img" wrapper sweep) の続編。comment-thread の
 *   AI badge も同 pattern (role="img" + aria-label) だが visible "AI" は aria-hidden 無し
 *   → SR が aria-label と visible を二重読み上げ ("AI Agent による投稿 AI")。
 *
 * 修正: visible "AI" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-901 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )

  // 1. AI badge inner visible aria-hidden
  if (
    /<span[\s\S]+?role="img"[\s\S]+?aria-label="AI Agent による投稿"[\s\S]+?>\s*<span aria-hidden="true">AI<\/span>/.test(
      ct,
    )
  ) {
    findings.push({
      level: 'info',
      message: `comment-thread AI badge visible "AI" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread AI badge visible aria-hidden 未統合`,
    })
  }

  // 2. role="img" + aria-label 維持
  if (/role="img"[\s\S]+?aria-label="AI Agent による投稿"/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-thread AI badge role="img" + aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `comment-thread AI badge role/aria-label 破壊`,
    })
  }

  // iter901 invariant: subtasks-panel childcount chip aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{grandchildren\.length\} 件<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter901 invariant: subtasks-panel childcount chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter901 invariant: 破壊` })
  }

  // iter896 invariant
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

  console.log(`\n=== Findings (comment-thread-ai-badge-aria-hidden-iter902) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
