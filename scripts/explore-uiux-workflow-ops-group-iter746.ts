/**
 * Phase 6.15 loop iter 746 (mode-D Desktop a11y) —
 * workflows-panel の Workflow 操作 group の aria-label に現在 enabled state を含めて拡張
 * (iter744 Goal / iter745 Sprint と同 pattern を Workflow 操作 group に展開)。
 *
 * 課題: workflows-panel.tsx 行 312 の `<div role="group" aria-label={`Workflow
 *   「${wf.name}」の操作 (実行 / 編集 / 有効化切替 / 削除)`}>` は静的「実行 / 編集 /
 *   有効化切替 / 削除」のままで現在 enabled / disabled が group focus 時に分からない。
 *   各 button (有効化 toggle 含む) の aria-label には現在状態が反映されているが
 *   group summary がない。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Workflow「${wf.name}」の操作 (現在: ${wf.enabled ? '有効' : '無効'}、
 *     実行 / 編集 / 有効化切替 / 削除)` に動的化
 *
 * 検証: source-side regex assert + iter727-745 invariant cross-check。
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

  // 1. Workflow 操作 group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(現在: \$\{wf\.enabled \? '有効' : '無効'\}、実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Workflow 操作 group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Workflow 操作 group 動的 aria-label 欠落` })
  }

  // 2. iter745 invariant: Sprint 操作 group 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の操作 \(現在: \$\{sprintStatusLabelJa\(status\)\}、期間編集 \/ ステータス遷移 \/ Retro \/ Pre-mortem\)`\}/.test(
      sp,
    )
  ) {
    findings.push({ level: 'info', message: `iter745 invariant: Sprint 操作 group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter745 invariant: 破壊` })
  }

  // 3. iter744 invariant: Goal status group 維持
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

  // 4. iter742 race invariant: view-switcher group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
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

  console.log(`\n=== Findings (workflow-ops-group-iter746) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
