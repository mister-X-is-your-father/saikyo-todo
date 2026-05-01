/**
 * Phase 6.15 loop iter 516 (mode-D Desktop a11y) —
 * WorkflowsPanel WorkflowCard 「履歴」 toggle button に aria-label を付与
 * (iter515 IntegrationsPanel pattern を 1 件水平展開、累計 2 件統一)。
 *
 * 課題: workflows-panel.tsx 行 343-358 の Workflow 実行履歴 disclosure button
 *   が aria-expanded / aria-controls はあるが aria-label が無い。Workflow が複数
 *   並ぶと SR が Tab で渡る時に button 名が全て「履歴」になり区別不能。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を `Workflow「${wf.name}」の実行履歴 (直近 5 件) を表示/閉じる`
 *     形式で動的に付与 (open/close で文言切替)。
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-expanded / aria-controls /
 * data-testid 維持。
 *
 * 検証: source-side regex assert + iter515 invariant cross-check
 *   (integrations-panel の同 pattern が破壊されてないこと)。
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

  // 1. 履歴 toggle button に aria-label が動的に付与されているか
  if (
    /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を閉じる`\s*:\s*`Workflow「\$\{wf\.name\}」の実行履歴 \(直近 5 件\) を表示`\s*\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: 履歴 toggle button aria-label (open/close で動的) 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: 履歴 toggle button aria-label 配線 不在`,
    })
  }

  // 2. 既存 aria 属性 (aria-expanded / aria-controls / data-testid) が壊れていないか
  if (
    /aria-expanded=\{runsOpen\}/.test(wp) &&
    /aria-controls=\{`wf-runs-\$\{wf\.id\}`\}/.test(wp) &&
    /data-testid=\{`wf-runs-toggle-\$\{wf\.id\}`\}/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: 履歴 toggle 既存 aria-expanded / aria-controls / data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: 履歴 toggle 既存 aria 属性 / data-testid 破壊`,
    })
  }

  // 3. iter515 invariant: integrations-panel の 履歴 toggle aria-label が維持されているか
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴 \(直近 5 件\) を閉じる`/.test(
      ip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter515 invariant: integrations-panel 履歴 toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515 invariant: integrations-panel 履歴 toggle aria-label 破壊`,
    })
  }

  // 4. WorkflowCard 内 sibling button の aria-label 維持 (実行 / 編集 / 有効化 / 削除)
  if (
    /Workflow「\$\{wf\.name\}」を削除/.test(wp) &&
    /Workflow「\$\{wf\.name\}」の graph \/ trigger を編集/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `workflows-panel.tsx: WorkflowCard sibling button aria-label (削除 / 編集) 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workflows-panel.tsx: sibling button aria-label が破壊された可能性`,
    })
  }

  console.log(`\n=== Findings (workflows-runs-toggle-aria-iter516) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
