/**
 * Phase 6.15 loop iter 677 (mode-D Desktop a11y) —
 * gantt-jump-today / workflow run-row toggle / workflow rerun button に
 * focus-visible ring 追加 (iter671-676 sweep 継続、3 button まとめ)。
 *
 * 課題:
 *   - gantt-view.tsx 行 383 の gantt-jump-today (今日の縦線まで横スクロール) は focus-visible 無し
 *   - workflows-panel.tsx 行 743 の wf-run-row toggle (run nodes detail 開閉) は focus-visible 無し
 *   - workflows-panel.tsx 行 781 の wf-run-row rerun button は focus-visible 無し
 *
 * fix (2 ファイル ~3 行差分):
 *   - 各 className に `focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`
 *
 * 検証: source-side regex assert + iter515-676 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. gantt-jump-today に focus-visible
  if (
    /text-foreground hover:bg-muted focus-visible:ring-ring relative rounded border px-2 py-0\.5 text-xs before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `gantt-jump-today focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-jump-today focus-visible なし` })
  }

  // 2. wf-run-row toggle に focus-visible
  if (
    /hover:bg-muted\/50 focus-visible:ring-ring flex w-full items-center gap-2 px-2 py-1\.5 text-left focus-visible:ring-2 focus-visible:outline-none/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `wf-run-row toggle focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-run-row toggle focus-visible なし` })
  }

  // 3. wf-run-row rerun に focus-visible
  if (
    /hover:bg-muted\/50 text-muted-foreground hover:text-foreground focus-visible:ring-ring flex shrink-0 items-center gap-1 border-l px-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50/.test(
      wf,
    )
  ) {
    findings.push({ level: 'info', message: `wf-run-row rerun focus-visible OK` })
  } else {
    findings.push({ level: 'warning', message: `wf-run-row rerun focus-visible なし` })
  }

  // 4. iter676 invariant: subtask-drag focus-visible 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (
    /text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -ml-1 cursor-grab touch-none rounded before:absolute before:-inset-3 before:content-\[''\] focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter676 invariant: subtask-drag 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter676 invariant: 破壊` })
  }

  // 5. iter671 invariant: severity-chip 維持
  const sc = readFileSync(resolve(process.cwd(), 'src/components/shared/severity-chip.tsx'), 'utf8')
  if (/'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'/.test(sc)) {
    findings.push({ level: 'info', message: `iter671 invariant: severity-chip 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter671 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-workflow-focus-iter677) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
