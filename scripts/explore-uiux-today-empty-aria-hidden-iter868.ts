/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * today-view EmptyState: クイック追加にフォーカス button visible text を
 * aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/today-view.tsx EmptyState の「クイック追加に
 *   フォーカス (キー: q)」 button は aria-label "クイック追加入力欄に
 *   フォーカス (q キーでも可)" が完全 content を含むのに visible text
 *   aria-hidden 無し → SR 重複読み上げ。
 *   iter861 (inbox-view) / iter864 (items-board) で同 pattern 統一済の最終
 *   catch-up — 「クイック追加にフォーカス (キー: q)」 EmptyState button が
 *   3 file (today / inbox / items-board) で完全統一する。
 *
 * fix (1 file ~1 spot):
 *   - visible "クイック追加にフォーカス (キー: q)" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *
 * 検証: source-side regex assert + iter861/864/867 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (
    /data-testid="today-empty-quick-add"[\s\S]+?<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `today-empty-quick-add button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `today-empty-quick-add button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(tv)) {
    findings.push({ level: 'info', message: `today-empty-quick-add aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `today-empty-quick-add aria-label 破壊` })
  }

  // 3 file 「クイック追加にフォーカス (キー: q)」 EmptyState 統一 invariant
  const sameQuickAddChecks: Array<[string, string]> = [
    ['inbox-view.tsx', 'src/components/workspace/inbox-view.tsx'],
    ['items-board.tsx', 'src/components/workspace/items-board.tsx'],
  ]
  let unified = 0
  for (const [name, path] of sameQuickAddChecks) {
    const f = readFileSync(resolve(process.cwd(), path), 'utf8')
    if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(f)) unified++
    else findings.push({ level: 'warning', message: `quick-add EmptyState 統一: ${name} 破壊` })
  }
  if (unified === sameQuickAddChecks.length) {
    findings.push({
      level: 'info',
      message: `quick-add EmptyState 統一 invariant: ${sameQuickAddChecks.length} file (inbox/items-board) + today (本 iter) で 3 種統一完了`,
    })
  }

  // iter867 invariant: sprints-empty-create aria-hidden
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
      message: `iter867 invariant: sprints-empty-create aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
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

  console.log(`\n=== Findings (today-empty-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
