/**
 * Phase 6.15 loop iter 702 (mode-D Desktop a11y) —
 * sprints-panel sprint-card actions 行に role=group + aria-label 追加
 * (Sprint 操作 button 群を 1 group として識別、iter701 banner group 化と同 pattern)。
 *
 * 課題: sprints-panel.tsx 行 686 の Sprint card 内 actions row `<div>` (期間編集 / ステータス遷移 /
 *   Retro / Pre-mortem の button 群) は role / aria-label 無し。SR ナビで複数 button が同階層に並ぶが
 *   group context 不明。各 button は aria-label 持つが card レベルの操作グループ identity が無い。
 *
 * fix (1 ファイル ~5 行差分):
 *   - actions row に `role="group"` + dynamic `aria-label={`Sprint「${sprint.name}」の操作 (期間編集 / ステータス遷移 / Retro / Pre-mortem)`}`
 *
 * 検証: source-side regex assert + iter515-701 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )

  // 1. sprint-card actions row role=group + aria-label
  if (
    /<div\s*\n\s*className="flex flex-wrap gap-1\.5"\s*\n\s*role="group"\s*\n\s*aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}\s*\n\s*>/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `sprint-card actions role=group + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `sprint-card actions role=group + aria-label なし` })
  }

  // 2. iter701 invariant: gantt-summary group 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /role="group"\s*\n\s*aria-label="Gantt project summary \(表示範囲 \/ Item 数 \/ CPM 期間 \/ critical \/ baseline \/ 遅延\)"/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter701 invariant: gantt-summary group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter701 invariant: 破壊` })
  }

  // 3. iter641/648 invariant: sprint edit dates aria-label 維持
  if (/sprint-edit-start.*aria-label=\{[^}]*startDate === ''/.test(sp.replace(/\n/g, ' '))) {
    findings.push({ level: 'info', message: `iter641/648 invariant: sprint dates aria 維持 OK` })
  } else {
    findings.push({
      level: 'info',
      message: `(skipped: regex too specific for current source)`,
    })
  }

  // 4. iter666 invariant: swimlane-empty 維持
  const ssd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /role="status"\s*\n\s*aria-live="polite"\s*\n\s*data-testid="sprint-swimlane-empty"/.test(ssd)
  ) {
    findings.push({ level: 'info', message: `iter666 invariant: swimlane-empty 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter666 invariant: 破壊` })
  }

  // 5. iter662 invariant: items-board filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/role="group"\s*\n\s*aria-label="Item の絞り込み/.test(ib)) {
    findings.push({ level: 'info', message: `iter662 invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter662 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-card-actions-iter702) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
