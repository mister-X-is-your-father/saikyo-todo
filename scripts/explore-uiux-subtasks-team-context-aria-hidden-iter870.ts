/**
 * Phase 6.15 loop iter870 — subtasks-panel.tsx の bulk-add button + team-context-editor.tsx
 * の save button visible text を aria-hidden span で wrap した regression guard。
 *
 *   pnpm tsx scripts/explore-uiux-subtasks-team-context-aria-hidden-iter870.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const subtasksSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasksSrc.includes('<span aria-hidden="true">\n              {create.isPending')) {
    if (
      !/<span aria-hidden="true">\s*\{create\.isPending \? '追加中…' : `\$\{pendingTitleCount\} 件追加`\}\s*<\/span>/.test(
        subtasksSrc,
      )
    ) {
      findings.push({
        level: 'error',
        message: 'subtasks-panel bulk-add visible wrap が無い',
      })
    }
  }

  const tcSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (!/<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(tcSrc)) {
    findings.push({
      level: 'error',
      message: 'team-context-editor save visible wrap が無い',
    })
  }

  console.log(`\n=== Findings (subtasks-team-context-aria-hidden iter870) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
