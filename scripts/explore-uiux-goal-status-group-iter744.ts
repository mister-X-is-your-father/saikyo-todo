/**
 * Phase 6.15 loop iter 744 (mode-D Desktop a11y) —
 * goals-panel の Goal ステータス操作 group の aria-label に現在ステータスを含めて拡張
 * (iter734 / iter742 / iter743 と同 pattern を Goal status group に展開)。
 *
 * 課題: goals-panel.tsx 行 472 の `<div role="group" aria-label={`Goal「${goal.title}」
 *   のステータス操作 (完了 / アーカイブ / 再開)`}>` は静的「(完了 / アーカイブ / 再開)」
 *   のままで現在ステータスが group focus 時に分からない。各 button の aria-label には
 *   遷移先が反映されているが、group 全体に focus が当たった時の context が薄い。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Goal「${goal.title}」のステータス操作 (現在: ${goalStatusLabelJa(status)}、
 *     完了 / アーカイブ / 再開)` に動的化 (既 import の goalStatusLabelJa を再利用)
 *
 * 検証: source-side regex assert + iter727-743 invariant cross-check。
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

  // 1. Goal status group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(現在: \$\{goalStatusLabelJa\(status\)\}、完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Goal status group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Goal status group 動的 aria-label 欠落` })
  }

  // 2. iter743 race invariant: filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Item の絞り込み \(MUST \/ ステータス \/ Sprint、現在 \$\{/.test(ib)) {
    findings.push({ level: 'info', message: `iter743 race invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter743 race invariant: 破壊` })
  }

  // 3. iter742 race invariant: view-switcher group 維持
  if (/aria-label=\{`表示切替 \(現在: \$\{VIEW_LABEL_JA\[view\] \?\? view\}\)`\}/.test(ib)) {
    findings.push({ level: 'info', message: `iter742 race invariant: view-switcher group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter742 race invariant: 破壊` })
  }

  // 4. iter734 invariant: workspace-mode radiogroup 維持
  const ws = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`workspace の default 作業モード \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      ws,
    )
  ) {
    findings.push({ level: 'info', message: `iter734 invariant: mode-selector radiogroup 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter734 invariant: 破壊` })
  }

  // 5. iter733 invariant: sprint-swimlane parent group 維持
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

  console.log(`\n=== Findings (goal-status-group-iter744) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
