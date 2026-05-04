/**
 * Phase 6.15 loop iter 731 (mode-D Desktop a11y) —
 * gantt-view project summary banner の静的 aria-label に各 metric の実値を含めて
 * 動的化 (iter722/723/727/728/729/730 と同 pattern: 静的 → 動的件数の進化)。
 *
 * 課題: gantt-view.tsx 行 301 の `<div role="group" aria-label="Gantt project
 *   summary (表示範囲 / Item 数 / CPM 期間 / critical / baseline / 遅延)">` は
 *   静的で各 metric の実値情報なし。SR は group 直行時に「表示範囲 何日 / Item
 *   何件 / ...」 が読み上げ最後 (各 span を enumerate) まで分からない。
 *
 * fix (1 ファイル ~10 行差分):
 *   - aria-label を動的 template literal に変更:
 *     `Gantt project summary (表示範囲 N 日 / 表示中 Item M 件 / CPM 期間 K 日 /
 *      critical X 件 / baseline Y 件 / 遅延 Z 件 計 W 日)`
 *   - 0 の metric は省略 (条件分岐で空 string)
 *
 * 検証: source-side regex assert + iter720-730 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')

  // 1. gantt summary banner が動的 aria-label を持つ
  const gvRegex =
    /aria-label=\{`Gantt project summary \(表示範囲 \$\{totalSpanDays\} 日 \/ 表示中 Item \$\{withDates\.length\} 件\$\{[\s\S]*?\}\)`\}/
  if (gvRegex.test(gv)) {
    findings.push({ level: 'info', message: `gantt summary 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt summary 動的 aria-label 欠落` })
  }

  // 2. iter730 invariant: pdca 4 段階 grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`PDCA 4 段階の集計 \(Plan \$\{counts\.plan\} \/ Do \$\{counts\.do\} \/ Check \$\{counts\.check\} \/ Act \$\{counts\.act\} 件\)`\}/.test(
      pdca,
    )
  ) {
    findings.push({ level: 'info', message: `iter730 invariant: pdca 4 段階 grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter730 invariant: 破壊` })
  }

  // 3. iter729 invariant: estimate-bias suggestions ul 維持
  const eb = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`典型的な見積分の校正推奨 \$\{suggestions\.length\} 件 \(calibration \$\{report\.calibrationFactor\.toFixed\(2\)\}× 適用\)`\}/.test(
      eb,
    )
  ) {
    findings.push({ level: 'info', message: `iter729 invariant: estimate-bias ul 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter729 invariant: 破壊` })
  }

  // 4. iter728 invariant: taskchute ol 維持
  const tc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/taskchute-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/.test(
      tc,
    )
  ) {
    findings.push({ level: 'info', message: `iter728 invariant: taskchute ol 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter728 invariant: 破壊` })
  }

  // 5. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-summary-group-iter731) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
