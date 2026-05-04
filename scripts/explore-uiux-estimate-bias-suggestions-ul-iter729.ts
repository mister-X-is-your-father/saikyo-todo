/**
 * Phase 6.15 loop iter 729 (mode-D Desktop a11y) —
 * estimate-bias-insight 校正推奨 ul の静的 aria-label に件数 + calibration 倍率を
 * 含めて動的化 (iter722/723/727/728 と同 pattern: 静的 → 動的)。
 *
 * 課題: estimate-bias-insight.tsx 行 173 の `<ul aria-label="典型的な見積分の校正
 *   推奨">` は静的で件数 / 適用 calibration 値情報なし。SR は ul 直行時に
 *   「何件 / 倍率いくら」 が読み上げ最後 (li 1 つずつ enumerate) まで分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `典型的な見積分の校正推奨 ${suggestions.length} 件
 *     (calibration ${report.calibrationFactor.toFixed(2)}× 適用)` に動的化
 *
 * 検証: source-side regex assert + iter720-728 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const eb = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )

  // 1. estimate-bias suggestions ul が動的件数 + calibration aria-label
  const ulRegex =
    /aria-label=\{`典型的な見積分の校正推奨 \$\{suggestions\.length\} 件 \(calibration \$\{report\.calibrationFactor\.toFixed\(2\)\}× 適用\)`\}/
  if (ulRegex.test(eb)) {
    findings.push({ level: 'info', message: `estimate-bias suggestions ul 動的 aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `estimate-bias suggestions ul 動的 aria-label 欠落`,
    })
  }

  // 2. iter728 invariant: taskchute ol 動的件数維持
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

  // 3. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (/iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  // 4. iter718 invariant: estimate-bias dl 内訳件数維持 (同 file 別 dl)
  if (
    /aria-label=\{`見積バイアス内訳 \(見積内 \$\{report\.underCount\} 件 \/ ±10% 以内 \$\{report\.onCount\} 件 \/ 超過 \$\{report\.overCount\} 件\)`\}/.test(
      eb,
    )
  ) {
    findings.push({ level: 'info', message: `iter718 invariant: estimate-bias 内訳 dl 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter718 invariant: 破壊` })
  }

  // 5. iter724 invariant: top-items ol 維持
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

  console.log(`\n=== Findings (estimate-bias-suggestions-ul-iter729) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
