/**
 * Phase 6.15 loop iter 519 (mode-D Desktop a11y) —
 * GoalsPanel GoalCard の goal-toggle disclosure button に aria-controls を付与
 * (iter515-518 disclosure aria pattern 水平展開、aria-controls + panel id pair)。
 *
 * 課題: goals-panel.tsx 行 349-362 の goal-toggle button は aria-expanded +
 *   aria-label はあるが aria-controls 不在 (= disclosure panel との関連付けが
 *   SR に伝わらない)。CardContent (panel) 側にも id 不在。
 *
 * fix (1 ファイル ~2 行差分):
 *   - aria-controls={`goal-body-${goal.id}`} 付与 (button 側)
 *   - <CardContent id={`goal-body-${goal.id}`}> 付与 (panel 側)
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-expanded / aria-label /
 * data-testid 維持、iter95 (KR progressbar / form / disclosure) invariant 維持。
 *
 * 検証: source-side regex assert + iter515-518 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // 1. goal-toggle button に aria-controls が付与されているか
  if (/aria-controls=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: goal-toggle aria-controls 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: goal-toggle aria-controls 配線 不在`,
    })
  }

  // 2. CardContent panel に id 付与
  if (/<CardContent id=\{`goal-body-\$\{goal\.id\}`\}/.test(gp)) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: CardContent panel id 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: CardContent panel id 不在 (= aria-controls 先なし)`,
    })
  }

  // 3. 既存 aria 属性 (aria-expanded / aria-label / data-testid) が壊れていないか
  if (
    /aria-expanded=\{open\}/.test(gp) &&
    /aria-label=\{`Goal「\$\{goal\.title\}」の KR \$\{open \? '一覧を閉じる' : '一覧を開く'\}`\}/.test(
      gp,
    ) &&
    /data-testid=\{`goal-toggle-\$\{goal\.id\}`\}/.test(gp)
  ) {
    findings.push({
      level: 'info',
      message: `goals-panel.tsx: goal-toggle 既存 aria-expanded / aria-label / data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goals-panel.tsx: goal-toggle 既存 aria 属性 / data-testid 破壊`,
    })
  }

  // 4. iter515-518 invariant cross-check
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
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  const ok518 = /aria-controls="operation-board-done-yesterday-list"/.test(obw)
  if (ok515 && ok516 && ok517 && ok518) {
    findings.push({
      level: 'info',
      message: `iter515-518 invariant: 4 件 disclosure aria pattern 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-518 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517} 518=${ok518})`,
    })
  }

  console.log(`\n=== Findings (goals-panel-toggle-aria-controls-iter519) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
