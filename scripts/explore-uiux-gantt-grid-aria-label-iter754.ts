/**
 * Phase 6.15 loop iter 754 (mode-D Desktop a11y) —
 * gantt-view の role="grid" container の aria-label に Item 件数 + 期間日数を含めて拡張
 * (iter742-753 静的→動的 sweep を grid landmark に展開)。
 *
 * 課題: gantt-view.tsx 行 292 の `aria-label="Gantt チャート (item × 期間)"` は静的で
 *   「何件の Item / 何日の期間」 が grid focus 時に分からない。aria-rowcount/colcount は
 *   持っているが SR landmark navigation で「Gantt チャート (Item 5 件 × 期間 30 日)」 と
 *   即読まれるべき。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Gantt チャート (Item ${withDates.length} 件 × 期間 ${totalSpanDays} 日)` に動的化
 *
 * 検証: source-side regex assert + iter727-753 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. Gantt grid 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Gantt チャート \(Item \$\{withDates\.length\} 件 × 期間 \$\{totalSpanDays\} 日\)`\}/.test(
      gv,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Gantt grid 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Gantt grid 動的 aria-label 欠落` })
  }

  // 2. iter731 invariant: gantt summary 維持 (同 file 別箇所)
  if (
    /aria-label=\{`Gantt project summary \(表示範囲 \$\{totalSpanDays\} 日 \/ 表示中 Item \$\{withDates\.length\} 件/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter731 invariant: gantt summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter731 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-grid-aria-label-iter754) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
