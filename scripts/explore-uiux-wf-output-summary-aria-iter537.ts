/**
 * Phase 6.15 loop iter 537 (mode-D Desktop a11y) —
 * WorkflowsPanel WorkflowNodeRunsList output disclosure summary に aria-label + data-testid を補完。
 *
 * 課題: workflows-panel.tsx 行 823-828 の <summary>output (jsonb)</summary> は visible
 *   text のみ、aria-label / data-testid 不在。Workflow run の各 node ごとに繰り返し表示
 *   されるため、SR は「output (jsonb) ボタン」を連発で読み上げ、どの node の output か
 *   区別できない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label={`node ${nr.nodeId} の output (jsonb) を開閉`}
 *   - data-testid={`wf-node-run-output-summary-${nr.id}`}
 *
 * iter536 (sprint-swimlane summary) と同 pattern を WorkflowNodeRunsList に展開。
 * +5 行差分、機能不変、視覚 layout 不変、shadcn 編集なし、<details> wrapper / pre 中身 / 既存 testid 維持。
 *
 * 検証: source-side regex assert + iter536 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. summary aria-label
  if (
    /<summary\s+className="text-muted-foreground cursor-pointer"\s+aria-label=\{`node \$\{nr\.nodeId\} の output \(jsonb\) を開閉`\}\s+data-testid=\{`wf-node-run-output-summary-\$\{nr\.id\}`\}\s*>/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: output summary aria-label + data-testid 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: output summary aria-label / data-testid 不在`,
    })
  }

  // 2. iter536 invariant: sprint-swimlane summary aria-label 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprintName\}」の担当者 swim-lane Gantt を開閉`\}/.test(ssd) &&
    /data-testid=\{`sprint-swimlane-summary-\$\{sprintId\}`\}/.test(ssd)
  ) {
    findings.push({
      level: 'info',
      message: `iter536 invariant: sprint-swimlane summary aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter536 invariant: sprint-swimlane 破壊`,
    })
  }

  // 3. 既存 wf-node-run-error data-testid 維持
  if (/data-testid=\{`wf-node-run-error-\$\{nr\.id\}`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: wf-node-run-error data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: wf-node-run-error data-testid 破壊`,
    })
  }

  // 4. iter515-535 anchor invariant
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok535 = /aria-label=\{`「\$\{row\.original\.title\}」を編集`\}/.test(bv)
  if (ok515 && ok535) {
    findings.push({
      level: 'info',
      message: `iter515 + iter535 anchor invariant 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 / iter535 invariant: 破壊 (515=${ok515} 535=${ok535})`,
    })
  }

  console.log(`\n=== Findings (wf-output-summary-aria-iter537) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
