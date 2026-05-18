/**
 * Phase 6.15 loop iter 953 (mode-M Mobile audit, basics track) —
 * gantt-view.tsx 内 2 checkbox label (gantt-show-deps-toggle / gantt-hide-done-toggle)
 * に min-h-11 を付与、上 row の zoom select との列高さ統一の codify。
 *
 * 経緯: iter943/946 で items-board MUST filter / engineer-trigger-button checkbox label を
 *   min-h-11 化済。同 sweep 続編として gantt-view の 2 toggle label を grep で発見、
 *   `flex items-center gap-1 text-xs` + native size-3.5 (14px) checkbox + text-xs で
 *   label 全体 height < 44px、mobile 親指タップ不安定だった。
 *
 * 修正: 2 label の className に min-h-11 追加 (replace_all で exact match の 2 件のみ)。
 *   - ml-auto zoom select label (line 360) は内部 select.min-h-11 で height 継承するため変更不要
 *
 * 経路 B (本 script): 2 checkbox label に min-h-11 が含まれること + iter735/943/946/952 invariant 維持を静的検証。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []
  const cwd = process.cwd()

  // 1. gantt-view.tsx の 2 checkbox label に min-h-11
  const gv = readFileSync(resolve(cwd, 'src/components/workspace/gantt-view.tsx'), 'utf8')
  const showDepsLabel =
    /<label data-testid="gantt-show-deps-toggle" className="flex min-h-11 items-center gap-1 text-xs">/.test(
      gv,
    )
  const hideDoneLabel =
    /<label data-testid="gantt-hide-done-toggle" className="flex min-h-11 items-center gap-1 text-xs">/.test(
      gv,
    )
  if (showDepsLabel) {
    findings.push({
      level: 'info',
      message: `gantt-view gantt-show-deps-toggle label min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view gantt-show-deps-toggle label min-h-11 欠落`,
    })
  }
  if (hideDoneLabel) {
    findings.push({
      level: 'info',
      message: `gantt-view gantt-hide-done-toggle label min-h-11 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view gantt-hide-done-toggle label min-h-11 欠落`,
    })
  }

  // 2. iter952 invariant: risk-board severity counts helper 維持
  const rb = readFileSync(resolve(cwd, 'src/features/sprint/risk-board.ts'), 'utf8')
  if (/countAssigneesBySeverity/.test(rb) && /formatAssigneeLoadSeverityCountsJa/.test(rb)) {
    findings.push({
      level: 'info',
      message: `iter952 invariant: risk-board severity counts helper 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter952 invariant: 破壊` })
  }

  // 3. iter946 invariant: engineer-trigger-button label min-h-11 維持
  const et = readFileSync(
    resolve(cwd, 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (/<label className="flex min-h-11 items-center gap-1 text-xs">/.test(et)) {
    findings.push({
      level: 'info',
      message: `iter946 invariant: engineer-trigger-button label min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter946 invariant: 破壊` })
  }

  // 4. iter943 invariant: items-board MUST filter label min-h-11 維持
  const ib = readFileSync(resolve(cwd, 'src/components/workspace/items-board.tsx'), 'utf8')
  if (/<label htmlFor="filter-must" className="flex min-h-11 items-center gap-1">/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter943 invariant: items-board MUST filter label min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter943 invariant: 破壊` })
  }

  // 5. iter735 invariant
  const tce = readFileSync(resolve(cwd, 'src/components/workspace/team-context-editor.tsx'), 'utf8')
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-view-checkbox-label-tap-target-iter953) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main()
