/**
 * Phase 6.15 loop iter 719 (mode-D Desktop a11y) —
 * sprint-retro-widget 「計画 vs 納品」dl の aria-label に件数を含める拡張
 * (iter697-700 / iter717 / iter718 list aria-label sweep の続き)。
 *
 * 課題: sprint-retro-widget.tsx 行 116-119 の `<dl aria-label="計画 vs 納品 (計画 / 納品 / 差分)">` は
 *   件数情報なしで SR ユーザは dt/dd を navigation しないと値が分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `計画 vs 納品 (計画 ${planned} 件 / 納品 ${delivered} 件 / 差分 ${符号}${delta} 件)` に
 *
 * 検証: source-side regex assert + iter701-718 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )

  // 1. sprint-retro dl aria-label 件数拡張
  if (
    /aria-label=\{`計画 vs 納品 \(計画 \$\{planned\} 件 \/ 納品 \$\{delivered\} 件 \/ 差分 \$\{delta > 0 \? '\+' : ''\}\$\{delta\} 件\)`\}/.test(
      srw,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-retro dl aria-label 件数拡張 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro dl aria-label 件数拡張 なし`,
    })
  }

  // 2. iter718 invariant: estimate-bias dl 維持
  const ebi = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`見積バイアス内訳 \(見積内 \$\{report\.underCount\} 件 \/ ±10% 以内 \$\{report\.onCount\} 件 \/ 超過 \$\{report\.overCount\} 件\)`\}/.test(
      ebi,
    )
  ) {
    findings.push({ level: 'info', message: `iter718 invariant: estimate-bias dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter718 invariant: 破壊` })
  }

  // 3. iter717 invariant: weekly-insight anomalies 維持
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

  // 4. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
  }

  // 5. iter714 invariant: workspace-header actions 維持
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/aria-label="ヘッダー操作 \(ページ固有アクション \/ ユーティリティ\)"/.test(wh)) {
    findings.push({ level: 'info', message: `iter714 invariant: workspace-header 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter714 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-retro-dl-iter719) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
