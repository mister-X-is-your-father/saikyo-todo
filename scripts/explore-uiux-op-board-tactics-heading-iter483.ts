/**
 * Phase 6.15 loop iter 483 (mode-D Desktop a11y) —
 * OperationBoardWidget の forecast tactics 2 sub-section
 * (Quick wins / 集中ブロック) を `<div>` から `<h3>` heading semantic に昇格、codify。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx 行 156-203:
 *   - quickWins section の "⚡ Quick wins (N)" header が `<div className="font-medium text-emerald-800" id="op-board-quickwins-heading">`
 *     で plain div (heading semantic 不在) → SR の見出しナビ navigation 不可
 *   - focusBlocks section の "🎯 集中ブロック (N)" header も同じく `<div id="op-board-focus-heading">` で plain div
 *
 *   対比: 同 widget 内 Section component (行 308-320) は `<h3 id={headingId}>` で heading 化済、
 *   iter427 / iter428 / iter430 / iter431 / iter432 で確立した「widget heading semantic 統一」 pattern と
 *   不整合 (同 component 内で 5 sub-section が h3 だが forecast tactics 2 sub-section だけ div で漏れ)。
 *
 * fix (1 ファイル ~4 行差分):
 *   - `<div id="op-board-quickwins-heading">` → `<h3 id="op-board-quickwins-heading">`
 *   - `<div id="op-board-focus-heading">` → `<h3 id="op-board-focus-heading">`
 *   - className / id / 中身 / 配色 はすべて変更なし、open/close tag のみ昇格
 *
 * 機能追加なし、視覚 layout 不変、shadcn 編集なし。
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const path = 'src/components/workspace/operation-board-widget.tsx'
  const src = readFileSync(resolve(process.cwd(), path), 'utf8')

  // 1. quickWins section が h3 になっている
  if (
    /<h3\s+className="font-medium text-emerald-800"\s+id="op-board-quickwins-heading">[\s\S]{0,80}?Quick wins[\s\S]{0,80}?<\/h3>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: quickWins h3 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: quickWins h3 不在` })
  }

  // 2. focusBlocks section が h3 になっている
  if (
    /<h3\s+className="font-medium text-sky-800"\s+id="op-board-focus-heading">[\s\S]{0,80}?集中ブロック[\s\S]{0,80}?<\/h3>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: focusBlocks h3 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: focusBlocks h3 不在` })
  }

  // 3. 旧 plain div header が消えている (heading 昇格済)
  if (
    !/<div className="font-medium text-emerald-800" id="op-board-quickwins-heading">/.test(src) &&
    !/<div className="font-medium text-sky-800" id="op-board-focus-heading">/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: 旧 plain div header が消えている OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: 旧 plain div header が残存` })
  }

  // 4. ul の aria-labelledby 紐付け維持 (regression)
  if (
    /aria-labelledby="op-board-quickwins-heading"/.test(src) &&
    /aria-labelledby="op-board-focus-heading"/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: ul aria-labelledby 維持 OK (heading 化後も id は同一)`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: ul aria-labelledby 破壊` })
  }

  // 5. Section component の h3 pattern (iter427+ 確立済) 維持
  if (
    /<h3 id=\{headingId\} className=\{`flex items-center gap-1\.5 text-xs font-medium \$\{labelTone\}`\}>/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: Section h3 pattern (iter427+) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: Section h3 pattern 破壊` })
  }

  // 6. Card role="region" / aria-label="今日の作戦盤" / data-testid 維持 (regression)
  if (
    /role="region"\s+aria-label="今日の作戦盤"\s+data-testid="operation-board-widget"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: Card region role + aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Card region role / aria-label 破壊` })
  }

  console.log(`\n=== Findings (op-board-tactics-heading-iter483) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
