/**
 * Phase 6.15 loop iter 749 (mode-D Desktop a11y) —
 * workflows-panel の trigger プリセット group の aria-label に種別列挙 + 用途を含めて拡張
 * (iter748 node-presets と同 pattern を trigger-presets に展開)。
 *
 * 課題: workflows-panel.tsx 行 557 の `<div role="group" aria-label="trigger プリセット">`
 *   は静的で「何の trigger 種があるか」 が group focus 時に分からない。各 button の
 *   aria-label には個別 kind が反映されているが group summary がない。NODE_PRESETS と
 *   違って trigger は 4 種固定で hardcode されているため inline 列挙で OK。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label を `trigger プリセット (4 種: manual / cron / item-event / webhook、
 *     JSON に 1 click 投入)` に拡張 (= 種別列挙 + 用途明示)
 *
 * 検証: source-side regex assert + iter727-748 invariant cross-check。
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

  // 1. trigger プリセット group 拡張 aria-label
  const hasExpandedLabel =
    /aria-label="trigger プリセット \(4 種: manual \/ cron \/ item-event \/ webhook、JSON に 1 click 投入\)"/.test(
      wp,
    )

  if (hasExpandedLabel) {
    findings.push({ level: 'info', message: `trigger プリセット group 拡張 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `trigger プリセット group 拡張 aria-label 欠落`,
    })
  }

  // 2. iter748 invariant: node 追加プリセット group 維持 (同 file 隣接)
  if (
    /aria-label=\{`node 追加プリセット \(\$\{NODE_PRESETS\.length\} 種、graph JSON に skeleton を 1 click 投入\)`\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter748 invariant: node 追加プリセット group 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter748 invariant: 破壊` })
  }

  // 3. iter746 race invariant: Workflow 操作 group 維持
  if (
    /aria-label=\{`Workflow「\$\{wf\.name\}」の操作 \(現在: \$\{wf\.enabled \? '有効' : '無効'\}、実行 \/ 編集 \/ 有効化切替 \/ 削除\)`\}/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter746 race invariant: Workflow 操作 group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter746 race invariant: 破壊` })
  }

  // 4. iter747 race invariant: timer 操作 group 維持
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

  // 5. iter745 invariant: Sprint 操作 group 維持
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

  console.log(`\n=== Findings (workflow-trigger-presets-group-iter749) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
