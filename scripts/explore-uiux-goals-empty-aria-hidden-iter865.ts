/**
 * Phase 6.15 loop iter 865 (mode-D Desktop a11y) —
 * goals-panel EmptyState: 作成フォームへ button visible text を aria-hidden span
 * で wrap。
 *
 * 課題: src/components/workspace/goals-panel.tsx EmptyState の「作成フォームへ」
 *   button は aria-label "Goal 作成フォームの『Objective』入力欄にフォーカス" が
 *   完全 content を含むのに visible text aria-hidden 無し → SR 重複読み上げ。
 *   iter800-864 sweep で各 EmptyState 「作成フォームへ」 button (integrations /
 *   workflows / templates / time-entry) を消化済の最終 catch-up。
 *
 * fix (1 file ~1 spot):
 *   - visible "作成フォームへ" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter735/863/864 invariant cross-check。
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
  // goals-panel EmptyState 作成フォームへ button
  if (
    /data-testid="goals-empty-create"[\s\S]+?<span aria-hidden="true">作成フォームへ<\/span>/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goals-empty-create button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-empty-create button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="Goal 作成フォームの『Objective』入力欄にフォーカス"/.test(gp)) {
    findings.push({ level: 'info', message: `goals-empty-create aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `goals-empty-create aria-label 破壊` })
  }

  // iter862 invariant: templates EmptyState 作成フォームへ
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tp)) {
    findings.push({
      level: 'info',
      message: `iter862 invariant: templates EmptyState 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter862 invariant: 破壊` })
  }

  // iter859 invariant: workflows-panel EmptyState 作成フォームへ
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `iter859 invariant: workflows-panel EmptyState 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter859 invariant: 破壊` })
  }

  // iter858 invariant: time-entries-panel EmptyState 作成フォームへ
  const tep = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/time-entries-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(tep)) {
    findings.push({
      level: 'info',
      message: `iter858 invariant: time-entries-panel EmptyState 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter858 invariant: 破壊` })
  }

  // iter855 invariant: integrations-panel EmptyState 作成フォームへ
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">作成フォームへ<\/span>/.test(ip)) {
    findings.push({
      level: 'info',
      message: `iter855 invariant: integrations-panel EmptyState 作成フォームへ aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter855 invariant: 破壊` })
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

  console.log(`\n=== Findings (goals-empty-aria-hidden-iter865) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
