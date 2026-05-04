/**
 * Phase 6.15 loop iter 748 (mode-D Desktop a11y) —
 * workflows-panel の node 追加プリセット group の aria-label に件数を含めて拡張
 * (iter722-731 件数動的化 pattern を preset count にも展開)。
 *
 * 課題: workflows-panel.tsx 行 510 の `<div role="group" aria-label="node 追加プリセット">`
 *   は静的で「何種のプリセットがあるか」 が group focus 時に分からない。各 button の
 *   aria-label には個別 preset 名が反映されているが group summary がない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `node 追加プリセット (${NODE_PRESETS.length} 種、graph JSON に
 *     skeleton を 1 click 投入)` に動的化
 *
 * 検証: source-side regex assert + iter727-747 invariant cross-check。
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

  // 1. node 追加プリセット group 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`node 追加プリセット \(\$\{NODE_PRESETS\.length\} 種、graph JSON に skeleton を 1 click 投入\)`\}/.test(
      wp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `node 追加プリセット group 動的 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `node 追加プリセット group 動的 aria-label 欠落`,
    })
  }

  // 2. iter746 race invariant: Workflow 操作 group 維持 (同 file)
  if (
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(現在: \$\{wf\.enabled \? '有効' : '無効'\}、実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter746 race invariant: Workflow 操作 group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter746 race invariant: 破壊` })
  }

  // 3. iter747 race invariant: timer 操作 group 維持
  const at = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`タスクタイマーの操作 \(現在: \$\{running \? '計測中' : '一時停止中'\}、一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)`\}/.test(
      at,
    )
  ) {
    findings.push({ level: 'info', message: `iter747 race invariant: timer ops group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter747 race invariant: 破壊` })
  }

  // 4. iter745 invariant: Sprint 操作 group 維持
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

  // 5. iter744 invariant: Goal status group 維持
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

  console.log(`\n=== Findings (workflow-node-presets-group-iter748) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
