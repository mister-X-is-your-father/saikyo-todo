/**
 * Phase 6.15 loop iter 518 (mode-D Desktop a11y) —
 * OperationBoardWidget 「昨日 done」 disclosure button に aria-controls + aria-label を付与
 * (iter515-517 disclosure aria pattern 水平展開、累計 4 件統一)。
 *
 * 課題: operation-board-widget.tsx 行 260-283 の「昨日 done」disclosure button が
 *   aria-expanded はあるが aria-controls 不在 (= disclosure panel との関連付けが
 *   SR に伝わらない) + aria-label 不在 (visible text "昨日 done N 件" のみ、
 *   show/hide 意図が不明瞭)。disclosure panel 側の <div> にも id 不在で aria-controls
 *   先が無い状態。
 *
 * fix (1 ファイル ~6 行差分):
 *   - aria-controls="operation-board-done-yesterday-list" 付与
 *   - panel <div> に id="operation-board-done-yesterday-list" 付与
 *   - aria-label を `昨日 done N 件の一覧を表示/閉じる` で動的付与 (open/close で文言切替)
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-expanded / data-testid /
 * iter514 pseudo tap target invariant 維持。
 *
 * 検証: source-side regex assert + iter514-517 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. aria-controls 配線
  if (/aria-controls="operation-board-done-yesterday-list"/.test(obw)) {
    findings.push({
      level: 'info',
      message: `operation-board-widget.tsx: 昨日 done toggle aria-controls 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget.tsx: 昨日 done toggle aria-controls 配線 不在`,
    })
  }

  // 2. disclosure panel <div> に id 付与
  if (/id="operation-board-done-yesterday-list"/.test(obw)) {
    findings.push({
      level: 'info',
      message: `operation-board-widget.tsx: 昨日 done 一覧 div id 付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget.tsx: 一覧 div id 不在 (= aria-controls 先なし)`,
    })
  }

  // 3. aria-label 動的付与 (open/close + count)
  if (
    /aria-label=\{\s*showDoneYesterday\s*\?\s*`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を閉じる`\s*:\s*`昨日 done \$\{board\.doneYesterday\.count\} 件の一覧を表示`\s*\}/.test(
      obw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `operation-board-widget.tsx: 昨日 done toggle aria-label 動的付与 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget.tsx: aria-label 配線 不在`,
    })
  }

  // 4. iter514 pseudo tap target invariant 維持
  if (
    /className="hover:text-foreground text-muted-foreground relative flex items-center gap-1 text-xs before:absolute before:-inset-3 before:content-\[''\]"/.test(
      obw,
    ) &&
    /aria-expanded=\{showDoneYesterday\}/.test(obw) &&
    /data-testid="operation-board-done-yesterday-toggle"/.test(obw)
  ) {
    findings.push({
      level: 'info',
      message: `iter514 invariant: pseudo tap target + aria-expanded + data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter514 invariant: 破壊` })
  }

  // 5. iter515-517 invariant cross-check
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
  const ok515 = /aria-label=\{\s*importsOpen\s*\?\s*`Source「\$\{src\.name\}」の Pull 履歴/.test(ip)
  const ok516 = /aria-label=\{\s*runsOpen\s*\?\s*`Workflow「\$\{wf\.name\}」の実行履歴/.test(wp)
  const ok517 = /aria-label=\{\s*open\s*\?\s*`「\$\{label\}」の差分/.test(al)
  if (ok515 && ok516 && ok517) {
    findings.push({
      level: 'info',
      message: `iter515-517 invariant: 3 件 disclosure aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter515-517 invariant: 破壊 (515=${ok515} 516=${ok516} 517=${ok517})`,
    })
  }

  console.log(`\n=== Findings (operation-board-done-yesterday-aria-iter518) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
