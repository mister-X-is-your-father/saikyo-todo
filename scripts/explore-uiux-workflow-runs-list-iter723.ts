/**
 * Phase 6.15 loop iter 723 (mode-D Desktop a11y) —
 * workflows-panel WorkflowRunHistory ul の aria-label を実件数に動的化
 * (iter722 source-imports-list 動的化 と同 pattern)。
 *
 * 課題: workflows-panel.tsx 行 738 の `<ul aria-label="直近の実行履歴 (最新 5 件)">` は
 *   静的に "5 件" と書いているが実際の `runs.length` と必ず一致しない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `直近の実行履歴 ${runs.length} 件 (最新順)` に
 *
 * 検証: source-side regex assert + iter701-722 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. workflow-runs ul aria-label 動的化
  if (/aria-label=\{`直近の実行履歴 \$\{runs\.length\} 件 \(最新順\)`\}/.test(wf)) {
    findings.push({ level: 'info', message: `workflow-runs ul aria-label 動的化 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `workflow-runs ul aria-label 動的化 なし`,
    })
  }

  // 2. iter722 invariant: source-imports list 動的化 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`直近の Pull 履歴 \$\{imports\.length\} 件 \(最新順\)`\}/.test(ip)) {
    findings.push({ level: 'info', message: `iter722 invariant: source-imports 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter722 invariant: 破壊` })
  }

  // 3. iter720 invariant: cycle-check status 維持
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

  // 5. iter708 invariant: workflow-card actions 維持
  if (
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `iter708 invariant: workflow-card actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter708 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workflow-runs-list-iter723) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
