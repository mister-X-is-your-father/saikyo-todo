/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * sprints-panel EmptyState: 作成フォームへ button visible text を aria-hidden
 * span で wrap。
 *
 * 課題: src/components/workspace/sprints-panel.tsx EmptyState の「作成フォームへ」
 *   button は aria-label "Sprint 作成フォームの『名前』入力欄にフォーカス" が
 *   完全 content を含むのに visible text aria-hidden 無し → SR 重複読み上げ。
 *   iter865 (goals) で 4 種 EmptyState 「作成フォームへ」 統一済の最終 catch-up。
 *   sprints-panel は 6 種目 (= integrations / workflows / templates / time-entries
 *   / goals に続く 6 番目)。
 *
 * fix (1 file ~1 spot):
 *   - visible "作成フォームへ" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/865/866 invariant cross-check。
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
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="sprints-empty-create"[\s\S]+?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprints-empty-create button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprints-empty-create button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="Sprint 作成フォームの『名前』入力欄にフォーカス"/.test(sp)) {
    findings.push({ level: 'info', message: `sprints-empty-create aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `sprints-empty-create aria-label 破壊` })
  }

  // 6 種 EmptyState の総括 invariant (cross-file 統一確認)
  const emptyStateChecks: Array<[string, string]> = [
    ['integrations-panel.tsx', 'src/components/integrations/integrations-panel.tsx'],
    ['workflows-panel.tsx', 'src/components/workflow/workflows-panel.tsx'],
    ['templates-panel.tsx', 'src/components/template/templates-panel.tsx'],
    ['time-entries-panel.tsx', 'src/components/time-entry/time-entries-panel.tsx'],
    ['goals-panel.tsx', 'src/components/workspace/goals-panel.tsx'],
  ]
  let unified = 0
  for (const [name, path] of emptyStateChecks) {
    const f = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(f)) unified++
    else findings.push({ level: 'warning', message: `EmptyState 統一 invariant: ${name} 破壊` })
  }
  if (unified === emptyStateChecks.length) {
    findings.push({
      level: 'info',
      message: `EmptyState 統一 invariant: 5 file (integrations/workflows/templates/time-entries/goals) 全て aria-hidden 維持 OK + sprints (本 iter) で 6 種統一完了`,
    })
  }

  // iter866 invariant: workflows-panel run-history rerun aria-hidden
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: workflows-panel rerun "再" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (sprints-empty-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
