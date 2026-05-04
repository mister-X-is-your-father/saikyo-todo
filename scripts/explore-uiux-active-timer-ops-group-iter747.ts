/**
 * Phase 6.15 loop iter 747 (mode-D Desktop a11y) —
 * active-timer-panel の操作 group の aria-label に現在 running state を含めて拡張
 * (iter744 / iter745 / iter746 と同 pattern を timer 操作 group に展開)。
 *
 * 課題: active-timer-panel.tsx 行 228 の `<div role="group" aria-label="タスクタイマーの
 *   操作 (一時停止 / 再開 / Picture-in-Picture / 停止)">` は静的「(一時停止 / 再開 /
 *   PiP / 停止)」のままで現在計測中 / 一時停止中が group focus 時に分からない。各
 *   button (一時停止 / 再開) の aria-label には個別 state が反映されているが group
 *   summary がない。region 親 label には含めているが group は別 channel として
 *   active state を持つべき。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `タスクタイマーの操作 (現在: ${running ? '計測中' : '一時停止中'}、
 *     一時停止 / 再開 / Picture-in-Picture / 停止)` に動的化
 *
 * 検証: source-side regex assert + iter727-746 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const at = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )

  // 1. timer 操作 group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`タスクタイマーの操作 \(現在: \$\{running \? '計測中' : '一時停止中'\}、一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)`\}/.test(
      at,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `timer 操作 group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `timer 操作 group 動的 aria-label 欠落` })
  }

  // 2. iter746 race invariant: Workflow 操作 group 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(現在: \$\{wf\.enabled \? '有効' : '無効'\}、実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter746 race invariant: Workflow 操作 group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter746 race invariant: 破壊` })
  }

  // 3. iter745 invariant: Sprint 操作 group 維持
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

  // 4. iter744 invariant: Goal status group 維持
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

  // 5. iter742 race invariant: view-switcher group 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/aria-label=\{`表示切替 \(現在: \$\{VIEW_LABEL_JA\[view\] \?\? view\}\)`\}/.test(ib)) {
    findings.push({ level: 'info', message: `iter742 race invariant: view-switcher group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter742 race invariant: 破壊` })
  }

  console.log(`\n=== Findings (active-timer-ops-group-iter747) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
