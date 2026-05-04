/**
 * Phase 6.15 loop iter 751 (mode-D Desktop a11y) —
 * operation-board-widget の region aria-label に主要 metric を含めて拡張
 * (iter750 item-summary-region と同 pattern を operation-board に展開)。
 *
 * 課題: operation-board-widget.tsx 行 96 の `<Card role="region" aria-label="今日の
 *   作戦盤">` は静的で「今日何をすべきか」 が region focus 時に分からない。region は
 *   landmark navigation の対象なので、focus 時に key metric (overdue / MUST / 予定) が
 *   見えれば SR ユーザは widget 内へ降りる前に状態判断できる。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `今日の作戦盤 (期限超過 ${overdue} 件 / 今日 MUST ${must} 件 /
 *     今日予定 ${scheduled} 件)` に動的化
 *
 * 検証: source-side regex assert + iter727-750 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )

  // 1. operation-board region 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`今日の作戦盤 \(期限超過 \$\{board\.overdue\.total\} 件 \/ 今日 MUST \$\{board\.mustToday\.count\} 件 \/ 今日予定 \$\{board\.todayScheduled\.count\} 件\)`\}/.test(
      op,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `operation-board region 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `operation-board region 動的 aria-label 欠落` })
  }

  // 2. iter750 invariant: 案件サマリ region 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`案件サマリ\$\{[\s\S]*?progress[\s\S]*?\? ` \(進捗 \$\{progress\.pctDone\}%/.test(
      ip,
    )
  ) {
    findings.push({ level: 'info', message: `iter750 invariant: 案件サマリ region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter750 invariant: 破壊` })
  }

  // 3. iter749 invariant: workflow trigger プリセット group 維持
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

  // 4. iter748 invariant: node 追加プリセット group 維持
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

  // 5. iter727 invariant: operation-board ItemList ariaLabel 維持 (同 file 別箇所)
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  console.log(`\n=== Findings (operation-board-region-iter751) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
