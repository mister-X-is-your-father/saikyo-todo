/**
 * Phase 6.15 loop iter 753 (mode-D Desktop a11y) —
 * inbox-view container に role="region" + 動的 aria-label を追加
 * (iter750-752 region/landmark sweep を inbox-view に展開)。
 *
 * 課題: inbox-view.tsx 行 104 の `<div data-testid="inbox-view">` は role / aria-label
 *   が無く、SR の landmark navigation で Inbox view 全体に到達できない。iter752 で
 *   taskchute-view を landmark 化したのと対称に inbox も揃える。
 *
 * fix (1 ファイル ~5 行差分):
 *   - div に `role="region"` + `aria-label={`Inbox view (${len} 件、scheduledFor も期限も未設定、
 *     健全性: ${hint})`}` を追加
 *
 * 検証: source-side regex assert + iter727-752 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')

  // 1. inbox-view region + 動的 aria-label
  const hasRegion = /data-testid="inbox-view"\s+role="region"/.test(iv)
  const hasDynamicLabel =
    /aria-label=\{`Inbox view \(\$\{inbox\.length\} 件、scheduledFor も期限も未設定、健全性: \$\{healthChip\.label\}\)`\}/.test(
      iv,
    )

  if (hasRegion && hasDynamicLabel) {
    findings.push({ level: 'info', message: `inbox-view region + 動的 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `inbox-view region 不完全 (region=${hasRegion} label=${hasDynamicLabel})`,
    })
  }

  // 2. iter752 invariant: taskchute-view region 維持
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

  // 3. iter751 invariant: operation-board region 維持
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

  // 4. iter750 invariant: 案件サマリ region 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`案件サマリ\$\{[\s\S]*?progress[\s\S]*?\? ` \(進捗 \$\{progress\.pctDone\}%/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter750 invariant: 案件サマリ region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter750 invariant: 破壊` })
  }

  // 5. iter749 invariant: workflow trigger プリセット group 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="trigger プリセット \(4 種: manual \/ cron \/ item-event \/ webhook、JSON に 1 click 投入\)"/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter749 invariant: trigger プリセット group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter749 invariant: 破壊` })
  }

  console.log(`\n=== Findings (inbox-view-region-iter753) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
