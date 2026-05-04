/**
 * Phase 6.15 loop iter 745 (mode-D Desktop a11y) —
 * sprints-panel の Sprint 操作 group の aria-label に現在ステータスを含めて拡張
 * (iter744 Goal status group と同 pattern を Sprint 操作 group に展開)。
 *
 * 課題: sprints-panel.tsx 行 694 の `<div role="group" aria-label={`Sprint
 *   「${sprint.name}」の操作 (期間編集 / ステータス遷移 / Retro / Pre-mortem)`}>` は
 *   静的「期間編集 / ステータス遷移 / ...」のままで現在ステータスが group focus 時に
 *   分からない。各 button の aria-label には遷移先が反映されているが group summary がない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Sprint「${sprint.name}」の操作 (現在: ${sprintStatusLabelJa(status)}、
 *     期間編集 / ステータス遷移 / Retro / Pre-mortem)` に動的化 (既 import の
 *     sprintStatusLabelJa を再利用)
 *
 * 検証: source-side regex assert + iter727-744 invariant cross-check。
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

  // 1. Sprint 操作 group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(現在: \$\{sprintStatusLabelJa\(status\)\}、期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}/.test(
      sp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Sprint 操作 group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Sprint 操作 group 動的 aria-label 欠落` })
  }

  // 2. iter744 invariant: Goal status group 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(現在: \$\{goalStatusLabelJa\(status\)\}、完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter744 invariant: Goal status group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter744 invariant: 破壊` })
  }

  // 3. iter743 race invariant: filter group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-label=\{`Item の絞り込み \(MUST \/ ステータス \/ Sprint、現在 \$\{/.test(ib)) {
    findings.push({ level: 'info', message: `iter743 race invariant: filter group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter743 race invariant: 破壊` })
  }

  // 4. iter742 race invariant: view-switcher group 維持
  if (/aria-label=\{`表示切替 \(現在: \$\{VIEW_LABEL_JA\[view\] \?\? view\}\)`\}/.test(ib)) {
    findings.push({ level: 'info', message: `iter742 race invariant: view-switcher group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter742 race invariant: 破壊` })
  }

  // 5. iter734 invariant: workspace-mode radiogroup 維持
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

  console.log(`\n=== Findings (sprint-ops-group-iter745) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
