/**
 * Phase 6.15 loop iter 514 (mode-D Desktop a11y / Mobile WCAG 2.5.5 AAA) —
 * ItemEditDialog conflict banner reload + OperationBoardWidget done-yesterday toggle の
 * tap target を pseudo で 44x44 化、iter505-508 pattern を 2 件水平展開。
 *
 * 課題: 残 2 件の小 inline raw button が WCAG 2.5.5 AAA 違反:
 *   - item-edit-dialog.tsx 行 301-305: 「最新を読み込み」 conflict banner button (px-2 py-1 text-[11px])
 *   - operation-board-widget.tsx 行 262-268: 昨日 done disclosure button (text-xs)
 *
 *   両方とも banner / row 内 inline で min-h-11 だと layout 崩壊。iter505-507 で確立した
 *   pseudo pattern を採用。
 *
 * fix (2 ファイル ~4 行差分):
 *   - 各 button の className に `relative` + `before:absolute before:-inset-3 before:content-['']` 挿入
 *
 * 機能不変、視覚 layout 不変、shadcn 編集なし、aria-label / aria-expanded / data-testid 維持。
 *
 * 検証: source-side regex assert + iter505-508 pseudo pattern 維持 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. item-edit-dialog conflict banner reload pseudo
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /className="relative shrink-0 rounded border border-amber-600\/50 px-2 py-1 text-\[11px\] font-medium before:absolute before:-inset-3 before:content-\[''\] hover:bg-amber-600\/20"/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: conflict banner reload pseudo 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: conflict banner reload pseudo 配線 不在`,
    })
  }
  if (
    /data-testid="item-edit-reload"/.test(ied) &&
    /aria-label="自分の編集内容を破棄してサーバの最新値を読み込み直す"/.test(ied)
  ) {
    findings.push({
      level: 'info',
      message: `item-edit-dialog.tsx: conflict banner aria-label + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `item-edit-dialog.tsx: conflict banner aria-label / data-testid 破壊`,
    })
  }

  // 2. operation-board done-yesterday toggle pseudo
  const obw = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    /className="hover:text-foreground text-muted-foreground relative flex items-center gap-1 text-xs before:absolute before:-inset-3 before:content-\[''\]"/.test(
      obw,
    )
  ) {
    findings.push({
      level: 'info',
      message: `operation-board-widget.tsx: done-yesterday toggle pseudo 配線 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget.tsx: done-yesterday toggle pseudo 配線 不在`,
    })
  }
  if (
    /data-testid="operation-board-done-yesterday-toggle"/.test(obw) &&
    /aria-expanded=\{showDoneYesterday\}/.test(obw)
  ) {
    findings.push({
      level: 'info',
      message: `operation-board-widget.tsx: data-testid + aria-expanded 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `operation-board-widget.tsx: data-testid / aria-expanded 破壊`,
    })
  }

  // 3. iter505-508 invariant: 8 件の pseudo tap target 維持 (cross-check)
  const checks = [
    'src/components/workspace/item-checkbox.tsx',
    'src/components/workspace/goals-panel.tsx',
    'src/components/workspace/kanban-view.tsx',
    'src/components/workspace/activity-log.tsx',
    'src/components/workspace/gantt-view.tsx',
    'src/components/workspace/subtasks-panel.tsx',
  ]
  let allOk = true
  for (const c of checks) {
    const s = readFileSync(resolve(process.cwd(), c), 'utf8')
    if (!/before:absolute before:-inset-3/.test(s)) {
      allOk = false
      findings.push({ level: 'warning', message: `${c}: pseudo 維持 破壊` })
    }
  }
  if (allOk) {
    findings.push({
      level: 'info',
      message: `iter505-508 invariant: 6 file の pseudo tap target 維持 OK`,
    })
  }

  console.log(`\n=== Findings (conflict-banner-doneyesterday-pseudo-iter514) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
