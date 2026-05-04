/**
 * Phase 6.15 loop iter 730 (mode-D Desktop a11y) —
 * pdca-panel 4 段階集計 grid の静的 aria-label に各段階の件数を含めて動的化
 * (iter722/723/727/728/729 と同 pattern: 静的 → 動的件数)。
 *
 * 課題: pdca-panel.tsx 行 88 の `<div role="group" aria-label="PDCA 4 段階の集計
 *   (Plan / Do / Check / Act)">` は静的で各段階の件数情報なし。SR は group 直行時に
 *   「Plan 何件 / Do 何件 ...」 が読み上げ最後 (PdcaStat 4 つを enumerate) まで
 *   分からない。iter716 で「PDCA 4 段階の集計 (Plan / Do / Check / Act)」 を
 *   aria-label として追加したが、件数まで含めていなかった。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `PDCA 4 段階の集計 (Plan ${counts.plan} / Do ${counts.do} /
 *     Check ${counts.check} / Act ${counts.act} 件)` に動的化
 *
 * 検証: source-side regex assert + iter720-729 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )

  // 1. pdca-panel 4 段階 grid が動的件数 aria-label を持つ
  const gridRegex =
    /aria-label=\{`PDCA 4 段階の集計 \(Plan \$\{counts\.plan\} \/ Do \$\{counts\.do\} \/ Check \$\{counts\.check\} \/ Act \$\{counts\.act\} 件\)`\}/
  if (gridRegex.test(pdca)) {
    findings.push({ level: 'info', message: `pdca 4 段階 grid 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `pdca 4 段階 grid 動的 aria-label 欠落` })
  }

  // 2. iter729 invariant: estimate-bias suggestions ul 維持
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

  // 3. iter728 invariant: taskchute ol 維持
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

  // 4. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  // 5. iter720 invariant: cycle-check status 維持
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

  console.log(`\n=== Findings (pdca-stats-grid-iter730) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
