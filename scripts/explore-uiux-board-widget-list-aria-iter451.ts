/**
 * Phase 6.15 loop iter 451 (mode-D Desktop a11y) — sprint-swimlane-disclosure
 * + operation-board-widget の残 `<ul>` 群に aria-label/aria-labelledby を追加
 * (iter427-450 連続 widget heading 統一 14-16 件目)、codify。
 *
 * 課題: 2 ファイルの 3 ul で aria-label/aria-labelledby 不在:
 *   1. sprint-swimlane-disclosure.tsx: <ul className="space-y-1"> (lane 一覧)
 *   2. operation-board-widget.tsx: Quick wins ul (forecast.quickWins)
 *   3. operation-board-widget.tsx: 集中ブロック ul (forecast.focusBlocks)
 *
 * fix: 2 ファイル ~6 行差分。
 *   - swimlane: `<ul aria-label="Sprint Swimlane lane 一覧 ${rows.length} 件">`
 *   - operation-board Quick wins: 親 div に id, ul に aria-labelledby
 *   - operation-board 集中ブロック: 親 div に id, ul に aria-labelledby
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

  // 1. swimlane lane ul aria-label
  const swimlanePath = 'src/components/workspace/sprint-swimlane-disclosure.tsx'
  const swimlaneSrc = readFileSync(resolve(process.cwd(), swimlanePath), 'utf8')
  if (
    /<ul className="space-y-1" aria-label=\{`Sprint Swimlane lane 一覧 \$\{rows\.length\} 件`\}>/.test(
      swimlaneSrc,
    )
  ) {
    findings.push({ level: 'info', message: `${swimlanePath}: ul aria-label 配線 OK` })
  } else {
    findings.push({ level: 'warning', message: `${swimlanePath}: ul aria-label 配線 不在` })
  }

  // 2. operation-board widget Quick wins
  const opPath = 'src/components/workspace/operation-board-widget.tsx'
  const opSrc = readFileSync(resolve(process.cwd(), opPath), 'utf8')
  if (
    /id="op-board-quickwins-heading"[\s\S]{0,400}?<ul className="space-y-0\.5" aria-labelledby="op-board-quickwins-heading">/.test(
      opSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${opPath}: Quick wins div id + ul aria-labelledby OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${opPath}: Quick wins 配線 不在` })
  }

  // 3. operation-board widget 集中ブロック
  if (
    /id="op-board-focus-heading"[\s\S]{0,400}?<ul className="space-y-0\.5" aria-labelledby="op-board-focus-heading">/.test(
      opSrc,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${opPath}: 集中ブロック div id + ul aria-labelledby OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${opPath}: 集中ブロック 配線 不在` })
  }

  console.log(`\n=== Findings (board-widget-list-aria-iter451) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
