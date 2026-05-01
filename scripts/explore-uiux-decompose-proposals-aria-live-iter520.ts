/**
 * Phase 6.15 loop iter 520 (mode-D Desktop a11y) —
 * DecomposeProposalsPanel header status text に role="status" aria-live="polite" を付与。
 *
 * 課題: decompose-proposals-panel.tsx 行 121-152 の header 部 (タイトル + 説明) は
 *   `isAgentRunning` / `completedWithNoProposals` / `list.length` で 3 種類に
 *   動的切替されるが、aria-live が無く SR ユーザは Researcher の状態遷移
 *   (実行中 → 完了 → 提案 N 件) を能動的に知ることができない。
 *
 * fix (1 ファイル ~5 行差分):
 *   - <div className="min-w-0 flex-1"> に role="status" aria-live="polite" 付与
 *     (panel 全体ではなく header 領域のみで scope 最小化)
 *   - data-testid="decompose-proposals-status" 付与で test 経由 hook 化
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、既存 data-testid (decompose-proposals-panel
 * / agent-streaming-text / proposals-empty-msg) すべて維持。
 *
 * 検証: source-side regex assert + iter515-519 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. role="status" + aria-live="polite" + data-testid 付与
  if (
    /<div\s+className="min-w-0 flex-1"\s+role="status"\s+aria-live="polite"\s+data-testid="decompose-proposals-status"\s*>/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: header status (role + aria-live + data-testid) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: header status 配線 不在`,
    })
  }

  // 2. 既存 status 切替ロジック維持
  if (
    /isAgentRunning\s*\?\s*'Researcher が分解中…'/.test(dpp) &&
    /completedWithNoProposals\s*\?\s*'提案が出ませんでした'/.test(dpp) &&
    /`AI 分解の提案 \(\$\{list\.length\}\)`/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: 3 状態切替ロジック維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: 状態切替ロジック破壊`,
    })
  }

  // 3. 既存 data-testid 維持 (panel / streaming / empty)
  if (
    /data-testid="decompose-proposals-panel"/.test(dpp) &&
    /data-testid="agent-streaming-text"/.test(dpp) &&
    /data-testid="proposals-empty-msg"/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `decompose-proposals-panel.tsx: 既存 data-testid (panel / streaming / empty) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `decompose-proposals-panel.tsx: 既存 data-testid 破壊`,
    })
  }

  // 4. iter515-519 invariant cross-check
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  const al = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok518 = /aria-controls="operation-board-done-yesterday-list"/.test(obw)
  const ok519 = /aria-controls=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)
  if (ok515 && ok516 && ok517 && ok518 && ok519) {
    findings.push({
      level: 'info',
      message: `iter515-519 invariant: 5 件 disclosure aria pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-519 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517} 518=${ok518} 519=${ok519})`,
    })
  }

  console.log(`\n=== Findings (decompose-proposals-aria-live-iter520) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
