/**
 * Phase 6.15 loop iter 494 (mode-D Desktop a11y) —
 * OperationBoardWidget CardTitle に role="heading" aria-level={2} 追加、codify。
 *
 * 課題: src/components/workspace/operation-board-widget.tsx 行 99-105 の CardTitle が
 *   `<CardTitle className="flex items-center gap-2 text-base">今日の作戦盤</CardTitle>` で
 *   `role="heading" aria-level={2}` 漏れ → shadcn ui CardTitle は default h3 として render される。
 *
 *   問題: 同 widget 内の sub-section (iter483 で h3 化した Quick wins / 集中ブロック / Section
 *   component の h3) も全て h3。CardTitle が h3 のままだと heading hierarchy が flat (h3 並列)
 *   になり、SR の見出し ナビ navigation で「親と子」 が区別不能。
 *
 *   sister widget pattern (= iter427 / iter427-432 で確立した「CardTitle h2 + sub-section h3」 統一):
 *   - DataWidgetCard 行 89-93: CardTitle h2 ✓
 *   - SprintRetroWidget (DataWidgetCard 経由): h2 ✓
 *   - CycleCheckStatsCard (DataWidgetCard 経由): h2 ✓
 *   - DashboardView 各 Card: h2 ✓
 *   - OperationBoardWidget 直書き Card: 漏れ ✗
 *
 * fix (1 ファイル ~3 行追加):
 *   - `<CardTitle className="..." role="heading" aria-level={2}>...`
 *   - prettier で multi-line 整形
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし。CardTitle component 自体は既存。
 *
 * 検証: source-side regex assert + iter483 invariant (Quick wins / 集中ブロック h3) cross-check。
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

  // 1. CardTitle に role="heading" aria-level={2} 配線
  if (
    /<CardTitle[\s\S]{0,200}?className="flex items-center gap-2 text-base"[\s\S]{0,100}?role="heading"[\s\S]{0,80}?aria-level=\{2\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: CardTitle role="heading" aria-level={2} 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `${path}: CardTitle role="heading" aria-level={2} 配線 不在`,
    })
  }

  // 2. CardTitle 中身 (Target icon + 今日の作戦盤 + today date) 維持 (regression)
  if (
    /<Target className="text-primary h-4 w-4" aria-hidden="true" \/>[\s\S]{0,80}?今日の作戦盤[\s\S]{0,200}?<span className="text-muted-foreground text-xs font-normal">\{today\}/.test(
      src,
    )
  ) {
    findings.push({
      level: 'info',
      message: `${path}: CardTitle 中身 (Target + 今日の作戦盤 + today) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: CardTitle 中身 破壊` })
  }

  // 3. iter483 invariant: Quick wins h3 + 集中ブロック h3 維持
  if (
    /<h3\s+className="font-medium text-emerald-800"\s+id="op-board-quickwins-heading">/.test(src) &&
    /<h3\s+className="font-medium text-sky-800"\s+id="op-board-focus-heading">/.test(src)
  ) {
    findings.push({
      level: 'info',
      message: `${path}: iter483 invariant (Quick wins + 集中ブロック h3) 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `${path}: iter483 invariant 破壊` })
  }

  // 4. Section component の h3 pattern 維持 (regression)
  if (
    /<h3 id=\{headingId\} className=\{`flex items-center gap-1\.5 text-xs font-medium \$\{labelTone\}`\}>/.test(
      src,
    )
  ) {
    findings.push({ level: 'info', message: `${path}: Section h3 pattern 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Section h3 pattern 破壊` })
  }

  // 5. Card role="region" + aria-label 維持 (regression)
  if (
    /role="region"\s+aria-label="今日の作戦盤"\s+data-testid="operation-board-widget"/.test(src)
  ) {
    findings.push({ level: 'info', message: `${path}: Card region role + aria-label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `${path}: Card region role / aria-label 破壊` })
  }

  // 6. sister widget (DataWidgetCard) の CardTitle h2 pattern 維持 (= 統一性確認)
  const dwcSrc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/<CardTitle[\s\S]{0,200}?role="heading"[\s\S]{0,80}?aria-level=\{2\}/.test(dwcSrc)) {
    findings.push({
      level: 'info',
      message: `src/components/shared/data-widget-card.tsx: sister widget CardTitle h2 pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `src/components/shared/data-widget-card.tsx: sister widget CardTitle h2 pattern 破壊`,
    })
  }

  console.log(`\n=== Findings (op-board-cardtitle-h2-iter494) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
