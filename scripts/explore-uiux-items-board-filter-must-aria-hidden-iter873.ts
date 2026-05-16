/**
 * Phase 6.15 loop iter 873 (mode-D Desktop a11y) —
 * items-board filter MUST checkbox label visible text を aria-hidden span で
 * wrap。
 *
 * 課題: src/components/workspace/items-board.tsx の filter-must checkbox は
 *   aria-label "MUST のみ表示中 (クリックで解除)" / "MUST のみ表示に絞り込む" が
 *   完全 content (visible "MUST のみ" を含む) を含むのに、label の visible
 *   "MUST のみ" text は aria-hidden 無し → SR ユーザは aria-label を聞いた後、
 *   visible text も別途読み上げされる重複。
 *   <label htmlFor="filter-must"> で input と explicit 関連付け済 + input の
 *   aria-label が accessible name override しているため、visible text を
 *   aria-hidden span でも associate semantics は維持。
 *
 * fix (1 file ~1 spot):
 *   - visible "MUST のみ" を <span aria-hidden="true"> で wrap
 *   - aria-label 単独経路に統一、機能不変、視覚 layout 不変、shadcn 編集なし
 *   - <label htmlFor> による input 関連付けは維持
 *
 * 検証: source-side regex assert + iter735/871/872 invariant cross-check。
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
  if (/<span aria-hidden="true">MUST のみ<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board filter MUST checkbox visible "MUST のみ" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter MUST checkbox visible aria-hidden 未統合`,
    })
  }
  if (
    /aria-label=\{must \? 'MUST のみ表示中 \(クリックで解除\)' : 'MUST のみ表示に絞り込む'\}/.test(
      ib,
    )
  ) {
    findings.push({
      level: 'info',
      message: `items-board filter MUST aria-label (must on/off 両 state) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board filter MUST aria-label 破壊`,
    })
  }
  // <label htmlFor="filter-must"> による input 関連付け維持
  if (/<label htmlFor="filter-must"/.test(ib)) {
    findings.push({
      level: 'info',
      message: `items-board <label htmlFor="filter-must"> 関連付け維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `items-board <label htmlFor="filter-must"> 破壊`,
    })
  }

  // iter872 invariant: team-capacity summary aria-hidden
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">チームメンバー 余裕時間 \(今日 \/ 今週\)<\/span>/.test(tcp)) {
    findings.push({
      level: 'info',
      message: `iter872 invariant: team-capacity summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter872 invariant: 破壊` })
  }

  // iter864 invariant: items-board EmptyState aria-hidden
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter864 invariant: items-board EmptyState aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter864 invariant: 破壊` })
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

  console.log(`\n=== Findings (items-board-filter-must-aria-hidden-iter873) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
