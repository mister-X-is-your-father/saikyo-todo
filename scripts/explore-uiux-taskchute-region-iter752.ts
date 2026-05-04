/**
 * Phase 6.15 loop iter 752 (mode-D Desktop a11y) —
 * taskchute-view の Card に role="region" + 動的 aria-label を追加
 * (iter750 案件サマリ / iter751 操作板 region と同 pattern を taskchute に展開)。
 *
 * 課題: taskchute-view.tsx 行 103 の `<Card data-testid="taskchute-view">` は
 *   role / aria-label が無く、SR の landmark navigation で TaskChute mode 全体に
 *   到達できない。iter750/751 で 他 widget は landmark 化済なので taskchute も揃える。
 *
 * fix (1 ファイル ~5 行差分):
 *   - Card に `role="region"` + `aria-label={`TaskChute mode (今日の 1 列 timeline ${len} 件、
 *     合計 ${total} 分 / 残 ${remain} 分)`}` を追加
 *
 * 検証: source-side regex assert + iter727-751 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )

  // 1. taskchute Card region + 動的 aria-label
  const hasRegion = /<Card\s+data-testid="taskchute-view"\s+role="region"/.test(tc)
  const hasDynamicLabel =
    /aria-label=\{`TaskChute mode \(今日の 1 列 timeline \$\{ordered\.length\} 件、合計 \$\{ticker\.totalEstimateMin\} 分 \/ 残 \$\{ticker\.remainingEstimateMin\} 分\)`\}/.test(
      tc,
    )

  if (hasRegion && hasDynamicLabel) {
    findings.push({ level: 'info', message: `taskchute Card region + 動的 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute Card region 不完全 (region=${hasRegion} label=${hasDynamicLabel})`,
    })
  }

  // 2. iter751 invariant: operation-board region 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の作戦盤 \(期限超過 \$\{board\.overdue\.total\} 件 \/ 今日 MUST \$\{board\.mustToday\.count\} 件 \/ 今日予定 \$\{board\.todayScheduled\.count\} 件\)`\}/.test(
      op,
    )
  ) {
    findings.push({ level: 'info', message: `iter751 invariant: operation-board region 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter751 invariant: 破壊` })
  }

  // 3. iter750 invariant: 案件サマリ region 維持
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

  // 4. iter728 invariant: taskchute ol 維持 (同 file 別箇所)
  if (
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter728 invariant: taskchute ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter728 invariant: 破壊` })
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

  console.log(`\n=== Findings (taskchute-region-iter752) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
