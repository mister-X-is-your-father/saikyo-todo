/**
 * Phase 6.15 loop iter 750 (mode-D Desktop a11y) —
 * item-summary-panel の region aria-label に進捗 % + 件数 + blocked 数を含めて拡張
 * (iter722-748 件数動的化 pattern を region に展開)。
 *
 * 課題: item-summary-panel.tsx 行 74 の `<div role="region" aria-label="案件サマリ">`
 *   は静的で「進捗いくら / 何件 done / blocked いくつ」 が region focus 時に分からない。
 *   region は landmark navigation の対象なので、focus 時の summary が薄いと SR ユーザは
 *   panel 内へ降りるまで状態を把握できない。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label を `案件サマリ (進捗 ${pct}%、完了 ${done} / 全 ${total} 件、blocked ${n} 件)` に動的化
 *   - progress が null (子孫 fetch 中) なら static fallback (`案件サマリ`) のまま
 *   - blocked が 0 のときは省略
 *
 * 検証: source-side regex assert + iter727-749 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )

  // 1. 案件サマリ region 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`案件サマリ\$\{[\s\S]*?progress[\s\S]*?\? ` \(進捗 \$\{progress\.pctDone\}%/.test(
      ip,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `案件サマリ region 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `案件サマリ region 動的 aria-label 欠落` })
  }

  // 2. iter749 invariant: workflow trigger プリセット group 維持
  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="trigger プリセット \(4 種: manual \/ cron \/ item-event \/ webhook、JSON に 1 click 投入\)"/.test(
      wp,
    )
  ) {
    findings.push({ level: 'info', message: `iter749 invariant: trigger プリセット group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter749 invariant: 破壊` })
  }

  // 3. iter748 invariant: node 追加プリセット group 維持
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

  console.log(`\n=== Findings (item-summary-region-iter750) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
