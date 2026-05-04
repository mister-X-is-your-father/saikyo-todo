/**
 * Phase 6.15 loop iter 759 (mode-D Desktop a11y) —
 * sprint-retro-widget 完了率 progressbar の aria-label に進捗 % + severity を含めて拡張
 * (iter757 KR / iter758 PDCA Cycle と同 pattern を Sprint Retro 完了率 bar に展開)。
 *
 * 課題: sprint-retro-widget.tsx 行 97 の `aria-label="完了率"` は静的 (label のみ) で
 *   進捗 % / severity が見えない。aria-valuenow / aria-valuetext は持っているが、
 *   aria-label は landmark / progressbar focus 時に最初に読まれる属性。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Sprint Retro 完了率 ${summary.completionRate}%
 *     (${completionRateSeverityLabelJa(sev)})` に動的化
 *
 * 検証: source-side regex assert + iter727-758 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sr = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. sprint-retro 完了率 progressbar 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Sprint Retro 完了率 \$\{summary\.completionRate\}% \(\$\{completionRateSeverityLabelJa\(sev\)\}\)`\}/.test(
      sr,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `sprint-retro progressbar 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-retro progressbar 動的 aria-label 欠落` })
  }

  // 2. iter758 invariant: cycle 完了率 progressbar 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`PDCA Cycle 完了率 \$\{stats\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter758 invariant: cycle 完了率 progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter758 invariant: 破壊` })
  }

  // 3. iter757 invariant: KR progressbar 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`KR「\$\{kr\.title\}」進捗 \$\{pct\}%`\}/.test(gp)) {
    findings.push({ level: 'info', message: `iter757 invariant: KR progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter757 invariant: 破壊` })
  }

  // 4. iter756 race invariant: pdca period group 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`集計期間 \(現在: \$\{days\} 日、30 \/ 90 から選択\)`\}/.test(pdca)) {
    findings.push({ level: 'info', message: `iter756 race invariant: pdca period group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter756 race invariant: 破壊` })
  }

  // 5. iter755 race invariant: data-widget-card region 維持
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

  console.log(`\n=== Findings (sprint-retro-progressbar-iter759) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
