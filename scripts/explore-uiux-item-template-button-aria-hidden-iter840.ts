/**
 * Phase 6.15 loop iter 840 (mode-D Desktop a11y) —
 * item-edit-dialog "Template として保存" button visible text を aria-hidden span で wrap。
 *
 * 課題: item-edit-dialog.tsx 行 936 の Template 保存 button visible text は aria-label が
 *   完全 content を含むのに aria-hidden 無し。
 *
 * fix (1 ファイル ~3 行差分):
 *   - visible text を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-839 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const hasTemplateAriaHidden =
    /<span aria-hidden="true">\s*\n?\s*\{createTemplateFromItem\.isPending \? '保存中…' : 'Template として保存'\}\s*\n?\s*<\/span>/.test(
      ied,
    )
  if (hasTemplateAriaHidden) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog Template 保存 button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog Template 保存 button aria-hidden 不完全`,
    })
  }

  // iter839 invariant: item-edit-dialog Save + Cancel button aria-hidden
  if (
    /aria-label=\{`「\$\{item\.title\}」の編集をキャンセル`\}\s*\n?\s*>\s*\n\s*<span aria-hidden="true">キャンセル<\/span>/.test(
      ied,
    ) &&
    /<span aria-hidden="true">\{update\.isPending \? '保存中\.\.\.' : '保存'\}<\/span>/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `iter839 invariant: item-edit-dialog Save + Cancel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter839 invariant: 破壊` })
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

  console.log(`\n=== Findings (item-template-button-aria-hidden-iter840) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
