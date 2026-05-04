/**
 * Phase 6.15 loop iter 756 (mode-D Desktop a11y) —
 * pdca-panel の 集計期間 button group の aria-label に現在期間を含めて拡張
 * (iter734/742/744-755 静的→動的 sweep を pdca period group に展開)。
 *
 * 課題: pdca-panel.tsx 行 59 の `<div className="flex gap-1" role="group" aria-label="集計期間">`
 *   は静的で「30 日 / 90 日 のどちらが選択中か」 が group focus 時に分からない。各
 *   button は aria-pressed を持つが group 全体に focus が当たった時の context が薄い。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を `集計期間 (現在: ${days} 日、30 / 90 から選択)` に動的化
 *
 * 検証: source-side regex assert + iter727-755 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )

  // 1. pdca period group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`集計期間 \(現在: \$\{days\} 日、30 \/ 90 から選択\)`\}/.test(pdca)

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `pdca period group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `pdca period group 動的 aria-label 欠落` })
  }

  // 2. iter755 race invariant: data-widget-card region 維持
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/aria-label=\{count !== undefined \? `\$\{title\} \(\$\{count\} 件\)` : title\}/.test(dwc)) {
    findings.push({
      level: 'info',
      message: `iter755 race invariant: DataWidgetCard region 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter755 race invariant: 破壊` })
  }

  // 3. iter754 invariant: gantt-view grid 維持
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

  // 4. iter753 invariant: inbox-view region 維持
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

  // 5. iter730 invariant: pdca 4 段階 grid 維持 (同 file 別箇所)
  if (
    /aria-label=\{`PDCA 4 段階の集計 \(Plan \$\{counts\.plan\} \/ Do \$\{counts\.do\} \/ Check \$\{counts\.check\} \/ Act \$\{counts\.act\} 件\)`\}/.test(
      pdca,
    )
  ) {
    findings.push({ level: 'info', message: `iter730 invariant: pdca 4 段階 grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter730 invariant: 破壊` })
  }

  console.log(`\n=== Findings (pdca-period-group-iter756) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
