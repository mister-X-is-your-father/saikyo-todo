/**
 * Phase 6.15 loop iter 717 (mode-D Desktop a11y) —
 * weekly-insight-widget anomalies ul の aria-label を件数 + anomaly kind 情報に拡張
 * (iter697-700 list aria-label sweep の続き)。
 *
 * 課題: weekly-insight-widget.tsx 行 215 の `<ul aria-label="特筆事項">` は
 *   件数不明 + どんな種類の anomaly が含まれるか SR ユーザに不明。
 *   既存の anomaly list は集中日 (highCompletionDay) / 過小日 / 期限超過 spike の 3 種。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を `今週の特筆事項 ${件数} 件 (集中日 / 過小日 / 期限超過 spike)` に
 *
 * 検証: source-side regex assert + iter701-716 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )

  // 1. anomalies ul aria-label 拡張
  if (
    /aria-label=\{`今週の特筆事項 \$\{insight\.anomalies\.length\} 件 \(集中日 \/ 過小日 \/ 期限超過 spike\)`\}/.test(
      wi,
    )
  ) {
    findings.push({ level: 'info', message: `weekly-insight anomalies ul aria-label 拡張 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `weekly-insight anomalies ul aria-label 拡張 なし`,
    })
  }

  // 2. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
  }

  // 3. iter715 invariant: engineer-trigger row group 維持
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (/aria-label="Engineer Agent 起動 \(PR 自動起票 toggle \/ 実装起動\)"/.test(etb)) {
    findings.push({ level: 'info', message: `iter715 invariant: engineer-trigger 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter715 invariant: 破壊` })
  }

  // 4. iter714 invariant: workspace-header actions 維持
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/aria-label="ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)"/.test(wh)) {
    findings.push({ level: 'info', message: `iter714 invariant: workspace-header 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter714 invariant: 破壊` })
  }

  // 5. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  console.log(`\n=== Findings (weekly-insight-anomalies-iter717) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
