/**
 * Phase 6.15 loop iter 864 (mode-D Desktop a11y) —
 * offline retry-button + items-board EmptyState: 2 button visible text を
 * aria-hidden span で wrap (一括、2 file)。
 *
 * 課題: 2 button いずれも aria-label が完全 content を含むのに visible text は
 *   aria-hidden 無し → SR 重複読み上げ:
 *     1. ~offline/retry-button.tsx — 再読み込みして再試行 button
 *        aria-label "再読み込みして再試行 (ページ全体を読み直して接続を回復)"
 *     2. items-board.tsx EmptyState 「クイック追加にフォーカス (キー: q)」 button
 *        aria-label "クイック追加入力欄にフォーカス (q キーでも可)"
 *
 * fix (2 file ~2 spot):
 *   - 各 visible text を <span aria-hidden="true"> で wrap、aria-label 単独経路
 *   - 機能不変、視覚 layout 不変、shadcn 編集なし
 *   - iter800-863 sweep の続編 (offline page + items-board EmptyState 拡張)
 *
 * 検証: source-side regex assert + iter735/862/863 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const rb = readFileSync(resolve(process.cwd(), 'src/app/~offline/retry-button.tsx'), 'utf8')
  if (/<span aria-hidden="true">再読み込みして再試行<\/span>/.test(rb)) {
    findings.push({
      level: 'info',
      message: `offline retry-button visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `offline retry-button visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="再読み込みして再試行 \(ページ全体を読み直して接続を回復\)"/.test(rb)) {
    findings.push({
      level: 'info',
      message: `offline retry-button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `offline retry-button aria-label 破壊` })
  }

  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board EmptyState visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board EmptyState visible aria-hidden 未統合`,
    })
  }
  if (/aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board EmptyState aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `items-board EmptyState aria-label 破壊` })
  }

  // iter841 invariant: items-board view-switcher 9 button aria-hidden
  const viewSwitcherMatches = ib.match(/<span aria-hidden="true">/g) ?? []
  if (viewSwitcherMatches.length >= 10) {
    findings.push({
      level: 'info',
      message: `iter841 invariant: items-board view-switcher 9 + EmptyState 1 = 10+ aria-hidden 維持 OK (実測 ${viewSwitcherMatches.length})`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter841 invariant: 破壊 (実測 ${viewSwitcherMatches.length})`,
    })
  }

  // iter863 invariant: team-context-editor 保存 aria-hidden
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{upd\.isPending \? '保存中…' : '保存'\}<\/span>/.test(tce)) {
    findings.push({
      level: 'info',
      message: `iter863 invariant: team-context-editor 保存 aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter863 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (offline-board-empty-aria-hidden-iter864) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
