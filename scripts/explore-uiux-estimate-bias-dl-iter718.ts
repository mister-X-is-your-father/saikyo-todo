/**
 * Phase 6.15 loop iter 718 (mode-D Desktop a11y) —
 * estimate-bias-insight 内訳 dl の aria-label に件数 (under/on/over) を含める拡張
 * (iter697-700 list aria-label sweep + iter717 anomaly-list pattern の続き)。
 *
 * 課題: estimate-bias-insight.tsx 行 138-141 の `<dl aria-label="見積バイアス内訳">` は
 *   件数情報なしで navigation 時に SR ユーザは「3 つの dt/dd」を聞かないと内訳が分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `見積バイアス内訳 (見積内 ${underCount} 件 / ±10% 以内 ${onCount} 件 / 超過 ${overCount} 件)`
 *
 * 検証: source-side regex assert + iter701-717 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  // 1. estimate-bias dl aria-label 件数拡張
  if (
    /aria-label=\{`見積バイアス内訳 \(見積内 \$\{report\.underCount\} 件 \/ ±10% 以内 \$\{report\.onCount\} 件 \/ 超過 \$\{report\.overCount\} 件\)`\}/.test(
      ebi,
    )
  ) {
    findings.push({ level: 'info', message: `estimate-bias dl aria-label 件数拡張 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias dl aria-label 件数拡張 なし`,
    })
  }

  // 2. iter717 invariant: weekly-insight anomalies 維持
  const wi = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/weekly-insight-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今週の特筆事項 \$\{insight\.anomalies\.length\} 件 \(集中日 \/ 過小日 \/ 期限超過 spike\)`\}/.test(
      wi,
    )
  ) {
    findings.push({ level: 'info', message: `iter717 invariant: weekly-insight 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter717 invariant: 破壊` })
  }

  // 3. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
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

  // 5. iter709 invariant: active-timer actions 維持
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="タスクタイマーの操作 \(一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)"/.test(atp)
  ) {
    findings.push({ level: 'info', message: `iter709 invariant: active-timer actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter709 invariant: 破壊` })
  }

  console.log(`\n=== Findings (estimate-bias-dl-iter718) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
