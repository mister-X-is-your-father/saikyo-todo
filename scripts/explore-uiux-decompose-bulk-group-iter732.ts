/**
 * Phase 6.15 loop iter 732 (mode-D Desktop a11y) —
 * decompose-proposals-panel の bulk 操作 group 静的 aria-label に保留件数を
 * 含めて動的化 (iter722-731 と同 pattern: 静的 → 動的件数の進化)。
 *
 * 課題: decompose-proposals-panel.tsx 行 185 の `<div role="group" aria-label=
 *   "AI 分解提案の bulk 操作 (全て採用 / 全て却下 / 再分解)">` は静的で「対象が
 *   何件あるか」 が SR から見えない。各 button の aria-label には件数が含まれて
 *   いるが、group 直行時に context が消える。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `AI 分解提案の bulk 操作 (全て採用 / 全て却下 / 再分解、
 *     保留中 ${list.length} 件)` に動的化
 *
 * 検証: source-side regex assert + iter727-731 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // 1. decompose bulk operation group が動的件数 aria-label を持つ
  const dpRegex =
    /aria-label=\{`AI 分解提案の bulk 操作 \(全て採用 \/ 全て却下 \/ 再分解、保留中 \$\{list\.length\} 件\)`\}/
  if (dpRegex.test(dp)) {
    findings.push({ level: 'info', message: `decompose bulk group 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `decompose bulk group 動的 aria-label 欠落` })
  }

  // 2. iter731 invariant: gantt summary 維持
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

  // 3. iter730 invariant: pdca 4 段階 grid 維持
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

  // 4. iter729 invariant: estimate-bias suggestions ul 維持
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

  console.log(`\n=== Findings (decompose-bulk-group-iter732) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
