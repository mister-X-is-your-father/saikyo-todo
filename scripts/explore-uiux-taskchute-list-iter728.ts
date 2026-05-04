/**
 * Phase 6.15 loop iter 728 (mode-D Desktop a11y) —
 * taskchute-view ol の aria-label を静的 → 動的 (件数込み) に拡張。
 *
 * 課題: taskchute-view.tsx 行 141-144 の `<ol aria-label="今日の task を時刻昇順で並べた 1 列 timeline">`
 *   は件数情報なし。CardTitle は `${ordered.length} 件` を表示しているが ol 自体は件数不明。
 *   SR ユーザは ol を直接 navigation した時に「全部で何件あるか」が分からない (iter722 / iter723 と
 *   同 pattern: 静的 N 件 → 実件数動的 化と同じ思想)。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を template literal に変えて `${ordered.length} 件` を末尾に追加
 *
 * 検証: source-side regex assert + iter720-727 invariant cross-check。
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

  // 1. taskchute-view ol aria-label が動的 (件数込み) になっているか
  const dynamicAria =
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  if (dynamicAria) {
    findings.push({
      level: 'info',
      message: `taskchute-view ol aria-label 動的化 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `taskchute-view ol aria-label 動的化 不完全`,
    })
  }

  // 2. iter727 invariant: operation-board ItemList ariaLabel prop
  const ob = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/ariaLabel\?:\s*string/.test(ob)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel prop 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  // 3. iter726 invariant: today-view 静的キーボードヒント aria-live 削除維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  const hintRegex = /<p className="text-muted-foreground text-xs">\s*\n\s*キーボード: j\/k で移動/
  if (hintRegex.test(tv)) {
    findings.push({
      level: 'info',
      message: `iter726 invariant: today-view aria-live なし 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter726 invariant: 破壊` })
  }

  // 4. iter724 invariant: top-items ol 件数込み aria-label 維持
  const tic = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`直近 \$\{WINDOW_DAYS\} 日 Item 別稼働 top \$\{summary\.top\.length\} 件 \(合計時間が多い順\)`\}/.test(
      tic,
    )
  ) {
    findings.push({ level: 'info', message: `iter724 invariant: top-items ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter724 invariant: 破壊` })
  }

  // 5. iter720 invariant: cycle-check status dl 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`ステータス分布 \(完了 \$\{stats\.done\} 件 \/ 未完了 \$\{stats\.inProgressOrTodo\} 件 \/ cancelled \$\{stats\.cancelled\} 件\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter720 invariant: cycle-check status 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter720 invariant: 破壊` })
  }

  console.log(`\n=== Findings (taskchute-list-iter728) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
