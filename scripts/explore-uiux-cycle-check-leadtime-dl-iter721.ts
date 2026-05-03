/**
 * Phase 6.15 loop iter 721 (mode-D Desktop a11y) —
 * cycle-check-stats-card Lead time 統計 dl の aria-label に値を含める拡張
 * (iter697-700 / iter717-720 list aria-label sweep の続き、PDCA Cycle Check stats card の
 * 隣 dl との対称性も担保)。
 *
 * 課題: cycle-check-stats-card.tsx 行 94-96 の `<dl aria-label="Lead time 統計 (平均 / 中央 / 期間)">` は
 *   値情報なし、SR ユーザは dt/dd を navigation しないと値が分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `Lead time 統計 (平均 ${avg}h / 中央 ${median ?? '不明'}h / 期間 ${days}d)` に
 *
 * 検証: source-side regex assert + iter701-720 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )

  // 1. cycle-check leadtime dl aria-label 値拡張
  if (
    /aria-label=\{`Lead time 統計 \(平均 \$\{stats\.leadTimeAvgHours\}h \/ 中央 \$\{stats\.leadTimeMedianHours \?\? '不明'\}h \/ 期間 \$\{stats\.cycleDurationDays\}d\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `cycle-check leadtime dl aria-label 値拡張 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `cycle-check leadtime dl aria-label 値拡張 なし`,
    })
  }

  // 2. iter720 invariant: cycle-check status dl 維持
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  // 3. iter719 invariant: sprint-retro dl 維持
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`計画 vs 納品 \(計画 \$\{planned\} 件 \/ 納品 \$\{delivered\} 件 \/ 差分 \$\{delta > 0 \? '\+' : ''\}\$\{delta\} 件\)`\}/.test(
      srw,
    )
  ) {
    findings.push({ level: 'info', message: `iter719 invariant: sprint-retro dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter719 invariant: 破壊` })
  }

  // 4. iter718 invariant: estimate-bias dl 維持
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

  // 5. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
  }

  console.log(`\n=== Findings (cycle-check-leadtime-dl-iter721) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
