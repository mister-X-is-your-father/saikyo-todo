/**
 * Phase 6.15 loop iter 720 (mode-D Desktop a11y) —
 * cycle-check-stats-card ステータス分布 dl の aria-label に件数を含める拡張
 * + ラベル不整合 (旧: "blocked" / 実際: "cancelled") 修正
 * (iter697-700 / iter717-719 list aria-label sweep の続き)。
 *
 * 課題: cycle-check-stats-card.tsx 行 118-121 の `<dl aria-label="ステータス分布 (完了 / 未完了 / blocked)">`
 *   は件数情報なし、かつ実際の dt は "cancelled" なのに aria-label は "blocked" で SR 不整合。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `ステータス分布 (完了 ${stats.done} 件 / 未完了 ${stats.inProgressOrTodo} 件 / cancelled ${stats.cancelled} 件)`
 *
 * 検証: source-side regex assert + iter701-719 invariant cross-check。
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

  // 1. cycle-check status dl aria-label 件数 + ラベル整合
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `cycle-check status dl aria-label 件数 + 整合 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `cycle-check status dl aria-label 件数拡張 なし`,
    })
  }

  // 2. iter719 invariant: sprint-retro dl 維持
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

  // 3. iter718 invariant: estimate-bias dl 維持
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

  console.log(`\n=== Findings (cycle-check-status-dl-iter720) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
