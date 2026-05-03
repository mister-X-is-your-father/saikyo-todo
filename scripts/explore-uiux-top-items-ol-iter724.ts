/**
 * Phase 6.15 loop iter 724 (mode-D Desktop a11y) —
 * top-items-by-time-chip top N ol に aria-label 追加
 * (iter697-700 / iter717-723 list aria-label sweep の続き)。
 *
 * 課題: top-items-by-time-chip.tsx 行 164 の `<ol className="space-y-1">` は aria-label 無し。
 *   SR ユーザは ol をナビゲートしても何のリストかは sr-only h2 を読まないと分からない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - ol に `aria-label="直近 ${WINDOW_DAYS} 日 Item 別稼働 top ${count} 件 (合計時間が多い順)"`
 *
 * 検証: source-side regex assert + iter701-723 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tic = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )

  // 1. top-items ol aria-label 追加
  if (
    /aria-label=\{`直近 \$\{WINDOW_DAYS\} 日 Item 別稼働 top \$\{summary\.top\.length\} 件 \(合計時間が多い順\)`\}/.test(
      tic,
    )
  ) {
    findings.push({ level: 'info', message: `top-items ol aria-label 追加 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `top-items ol aria-label 追加 なし`,
    })
  }

  // 2. iter723 invariant: workflow-runs ul 維持
  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`直近の実行履歴 \$\{runs\.length\} 件 \(最新順\)`\}/.test(wf)) {
    findings.push({ level: 'info', message: `iter723 invariant: workflow-runs 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter723 invariant: 破壊` })
  }

  // 3. iter722 invariant: source-imports list 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`直近の Pull 履歴 \$\{imports\.length\} 件 \(最新順\)`\}/.test(ip)) {
    findings.push({ level: 'info', message: `iter722 invariant: source-imports 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter722 invariant: 破壊` })
  }

  // 4. iter720 invariant: cycle-check status 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  // 5. iter718 invariant: estimate-bias dl 維持
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

  console.log(`\n=== Findings (top-items-ol-iter724) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
