/**
 * Phase 6.15 loop iter 869 (mode-D Desktop a11y) —
 * goals-panel KR (Key Result) 追加 Submit button visible text を aria-hidden
 * span で wrap。
 *
 * 課題: src/components/workspace/goals-panel.tsx の Goal 内 KR 追加 form の
 *   Submit button は aria-label "Key Result をこの Goal に追加" / 関連 pending
 *   message が完全 content を含むのに visible text "KR 追加" は aria-hidden 無し
 *   → SR 重複読み上げ。iter865/867 で goals/sprints empty を消化済の最終
 *   catch-up。
 *
 * fix (1 file ~1 spot):
 *   - visible "KR 追加" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/867/868 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`kr-add-btn-\$\{goalId\}`\}[\s\S]+?<span aria-hidden="true">KR 追加<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel KR add button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel KR add button visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{[\s\S]+?'Key Result をこの Goal に追加'/.test(gp) &&
    /aria-label=\{[\s\S]+?'Key Result を追加中…'/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel KR add aria-label (active + pending) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `goals-panel KR add aria-label 破壊` })
  }

  // iter865 invariant: goals-empty-create
  if (
    /data-testid="goals-empty-create"[\s\S]+?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: goals-empty-create aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
  }

  // iter868 invariant: today-empty-quick-add aria-hidden
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /data-testid="today-empty-quick-add"[\s\S]+?<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter868 invariant: today-empty-quick-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter868 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-kr-add-aria-hidden-iter869) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
