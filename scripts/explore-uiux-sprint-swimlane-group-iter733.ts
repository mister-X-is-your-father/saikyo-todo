/**
 * Phase 6.15 loop iter 733 (mode-D Desktop a11y) —
 * sprint-swimlane-disclosure 親 group の aria-label に lane 件数を含めて拡張
 * (iter722-732 と同 pattern: 静的 → 動的件数の進化)。
 *
 * 課題: sprint-swimlane-disclosure.tsx 行 149 の `<div role="group" aria-label=
 *   {`Sprint「${sprintName}」 担当者 swim-lane`}>` は sprint 名のみ。SR は group
 *   直行時に「lane が何件あるか」 が分からず、子 ul (rows.length 件) まで降りて
 *   初めて把握できる。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Sprint「${sprintName}」 担当者 swim-lane (lane ${rows.length} 件)` に拡張
 *
 * 検証: source-side regex assert + iter727-732 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // 1. swimlane parent group が lane 件数 aria-label を持つ
  const sdRegex =
    /aria-label=\{`Sprint「\$\{sprintName\}」 担当者 swim-lane \(lane \$\{rows\.length\} 件\)`\}/
  if (sdRegex.test(sd)) {
    findings.push({ level: 'info', message: `swimlane parent group lane 件数 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `swimlane parent group lane 件数 aria-label 欠落` })
  }

  // 2. iter732 invariant: decompose bulk group 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解、保留中 \$\{list\.length\} 件\)`\}/.test(
      dp,
    )
  ) {
    findings.push({ level: 'info', message: `iter732 invariant: decompose bulk group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter732 invariant: 破壊` })
  }

  // 3. iter731 invariant: gantt summary 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`Gantt project summary \(表示範囲 \$\{totalSpanDays\} 日 \/ 表示中 Item \$\{withDates\.length\} 件/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter731 invariant: gantt summary 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter731 invariant: 破壊` })
  }

  // 4. iter730 invariant: pdca 4 段階 grid 維持
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

  console.log(`\n=== Findings (sprint-swimlane-group-iter733) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
