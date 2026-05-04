/**
 * Phase 6.15 loop iter 757 (mode-D Desktop a11y) —
 * goals-panel KR progressbar の aria-label に進捗 % を含めて拡張
 * (iter750-756 静的→動的 sweep を progressbar aria-label に展開)。
 *
 * 課題: goals-panel.tsx 行 718 の `aria-label={`KR「${kr.title}」進捗`}` は静的 (KR 名のみ)
 *   で進捗 % が見えない。aria-valuenow / aria-valuetext は持っているが、aria-label は
 *   landmark / progressbar focus 時に最初に読まれる属性。Sprint progressbar は健全性
 *   chip を含めて拡張済 (iter427/iter438 等) なので KR も同様に揃える。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `KR「${kr.title}」進捗 ${pct}%` に動的化 (% 直書き)
 *
 * 検証: source-side regex assert + iter727-756 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. KR progressbar 動的 aria-label
  const hasDynamicLabel = /aria-label=\{`KR「\$\{kr\.title\}」進捗 \$\{pct\}%`\}/.test(gp)

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `KR progressbar 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `KR progressbar 動的 aria-label 欠落` })
  }

  // 2. iter756 race invariant: pdca period group 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`集計期間 \(現在: \$\{days\} 日、30 \/ 90 から選択\)`\}/.test(pdca)) {
    findings.push({ level: 'info', message: `iter756 race invariant: pdca period group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter756 race invariant: 破壊` })
  }

  // 3. iter755 race invariant: data-widget-card region 維持
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

  // 4. iter744 invariant: Goal status group 維持 (同 file 別箇所)
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(現在: \$\{goalStatusLabelJa\(status\)\}、完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter744 invariant: Goal status group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter744 invariant: 破壊` })
  }

  // 5. iter750 invariant: 案件サマリ region 維持
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

  console.log(`\n=== Findings (kr-progressbar-aria-iter757) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
