/**
 * Phase 6.15 loop iter 755 (mode-D Desktop a11y) —
 * shared/data-widget-card.tsx に role="region" + 動的 aria-label を追加
 * (1 ファイル変更で 3 callers (cycle-check / sprint-retro / sprint-risk-board) を
 * landmark 化、iter750-754 region/landmark sweep の最大効率版)。
 *
 * 課題: data-widget-card.tsx 行 86 の `<Card className={cn(className)} data-testid={testId}>`
 *   は role / aria-label が無く、SR の landmark navigation で widget 全体に到達できない。
 *   3 callers (sprint-retro / sprint-risk-board / cycle-check-stats) で個別に role を
 *   足すと冗長。共通 component で 1 箇所変更すれば 3 widget が同時に landmark 化。
 *
 * fix (1 ファイル ~5 行差分):
 *   - Card に `role="region"` + `aria-label={count !== undefined ? `${title} (${count} 件)` : title}` を追加
 *   - title prop は既存 (string)、count prop は既存 (optional number)
 *
 * 検証: source-side regex assert + iter727-754 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )

  // 1. DataWidgetCard が role="region" + 動的 aria-label を持つ
  const hasRegion = /<Card[\s\S]*?data-testid=\{testId\}[\s\S]*?role="region"/.test(dwc)
  const hasDynamicLabel =
    /aria-label=\{count !== undefined \? `\$\{title\} \(\$\{count\} 件\)` : title\}/.test(dwc)

  if (hasRegion && hasDynamicLabel) {
    findings.push({
      level: 'info',
      message: `DataWidgetCard region + 動的 aria-label OK (3 callers landmark 化)`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `DataWidgetCard region 不完全 (region=${hasRegion} label=${hasDynamicLabel})`,
    })
  }

  // 2. iter754 invariant: gantt-view grid 動的 aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`Gantt チャート \(Item \$\{withDates\.length\} 件 × 期間 \$\{totalSpanDays\} 日\)`\}/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter754 invariant: gantt grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter754 invariant: 破壊` })
  }

  // 3. iter753 invariant: inbox-view region 維持
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (
    /aria-label=\{`Inbox view \(\$\{inbox\.length\} 件、scheduledFor も期限も未設定、健全性: \$\{healthChip\.label\}\)`\}/.test(
      iv,
    )
  ) {
    findings.push({ level: 'info', message: `iter753 invariant: inbox-view region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter753 invariant: 破壊` })
  }

  // 4. iter752 invariant: taskchute region 維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`TaskChute mode \(今日の 1 列 timeline \$\{ordered\.length\} 件、合計 \$\{ticker\.totalEstimateMin\} 分 \/ 残 \$\{ticker\.remainingEstimateMin\} 分\)`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter752 invariant: taskchute region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
  }

  // 5. iter751 invariant: operation-board region 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の作戦盤 \(期限超過 \$\{board\.overdue\.total\} 件 \/ 今日 MUST \$\{board\.mustToday\.count\} 件 \/ 今日予定 \$\{board\.todayScheduled\.count\} 件\)`\}/.test(
      op,
    )
  ) {
    findings.push({ level: 'info', message: `iter751 invariant: operation-board region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter751 invariant: 破壊` })
  }

  console.log(`\n=== Findings (data-widget-card-region-iter755) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
