/**
 * Phase 6.15 loop iter 841 (mode-D Desktop a11y) —
 * items-board view-switcher 9 button visible text を aria-hidden span で wrap (一括)。
 *
 * 課題: items-board.tsx の 9 view-switcher button (Today/Inbox/Kanban/Backlog/Gantt/
 *   Dashboard/日次/週次/月次) の visible text は parent Button に aria-label が完全
 *   content を含むのに aria-hidden 無し。iter800-840 sweep の続編、view-switcher 統一性。
 *
 * fix (1 ファイル ~9 行差分、9 button の visible text 全部を aria-hidden span に wrap):
 *
 * 検証: source-side regex assert + iter735-840 invariant cross-check。
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
  const checks = [
    /<span aria-hidden="true">Today<\/span>/,
    /<span aria-hidden="true">Inbox<\/span>/,
    /<span aria-hidden="true">Kanban<\/span>/,
    /<span aria-hidden="true">Backlog<\/span>/,
    /<span aria-hidden="true">Gantt<\/span>/,
    /<span aria-hidden="true">Dashboard<\/span>/,
    /<span aria-hidden="true">日次<\/span>/,
    /<span aria-hidden="true">週次<\/span>/,
    /<span aria-hidden="true">月次<\/span>/,
  ]
  const allOk = checks.every((re) => re.test(ib))
  if (allOk) {
    findings.push({
      level: 'info',
      message: `view-switcher 9 button visible aria-hidden 統一性 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `view-switcher 9 button aria-hidden 不完全`,
    })
  }

  // iter840 invariant: item-edit-dialog Template button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\s*\n?\s*\{createTemplateFromItem\.isPending \? '保存中…' : 'Template として保存'\}\s*\n?\s*<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter840 invariant: item-edit-dialog Template button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter840 invariant: 破壊` })
  }

  // iter838 invariant: workflows-panel Workflow buttons aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{create\.isPending \? '作成中…' : '作成'\}<\/span>/.test(wp) &&
    /<span aria-hidden="true">\{trigger\.isPending \? '実行中…' : '実行'\}<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `iter838 invariant: workflows-panel buttons aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter838 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
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

  console.log(`\n=== Findings (view-switcher-buttons-aria-hidden-iter841) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
