/**
 * Phase 6.15 loop iter 734 (mode-D Desktop a11y) —
 * workspace-mode-selector の radiogroup 静的 aria-label に現在の選択値 (label) を
 * 含めて拡張 (iter722-733 と同 pattern: 静的 → 動的)。
 *
 * 課題: workspace-mode-selector.tsx 行 112 の `<div role="radiogroup" aria-label=
 *   "workspace の default 作業モード">` は静的で「現在何が選ばれているか」 が
 *   group focus 時に分からない。各 button に aria-checked が付いているが、
 *   radiogroup 全体に focus が当たった時 (= radio nav 開始前) の context が薄い。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `workspace の default 作業モード (現在: ${currentLabel})` に動的化
 *   - currentLabel は MODE_OPTIONS から find (fallback は raw value)
 *
 * 検証: source-side regex assert + iter727-733 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ws = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )

  // 1. workspace-mode-selector radiogroup が動的 aria-label
  const wsRegex =
    /aria-label=\{`workspace の default 作業モード \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/
  if (wsRegex.test(ws)) {
    findings.push({ level: 'info', message: `mode-selector radiogroup 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `mode-selector radiogroup 動的 aria-label 欠落` })
  }

  // 2. iter733 invariant: sprint-swimlane parent group 維持
  const sd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprintName\}」 担当者 swim-lane \(lane \$\{rows\.length\} 件\)`\}/.test(
      sd,
    )
  ) {
    findings.push({ level: 'info', message: `iter733 invariant: swimlane group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter733 invariant: 破壊` })
  }

  // 3. iter732 invariant: decompose bulk group 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解、保留中 \$\{list\.length\} 件\)`\}/.test(
      dp,
    )
  ) {
    findings.push({ level: 'info', message: `iter732 invariant: decompose bulk group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter732 invariant: 破壊` })
  }

  // 4. iter731 invariant: gantt summary 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`Gantt project summary \(表示範囲 \$\{totalSpanDays\} 日 \/ 表示中 Item \$\{withDates\.length\} 件/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter731 invariant: gantt summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter731 invariant: 破壊` })
  }

  // 5. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  console.log(`\n=== Findings (workspace-mode-radiogroup-iter734) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
