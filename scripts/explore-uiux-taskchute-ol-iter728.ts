/**
 * Phase 6.15 loop iter 728 (mode-D Desktop a11y) —
 * taskchute-view ol の静的 aria-label に件数を含めて、SR の list shortcut で
 * 「今日 何件」 が即わかるよう拡張 (iter722/723 と同 pattern: 静的 → 動的)。
 *
 * 課題: taskchute-view.tsx 行 143 の `<ol aria-label="今日の task を時刻昇順
 *   で並べた 1 列 timeline">` は静的で件数情報なし。SR は ol に直行した時
 *   「何件あるか」 が読み上げ最後 (li 1 つずつ enumerate) まで分からない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を `今日の task を時刻昇順で並べた 1 列 timeline ${ordered.length} 件` に
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

  // 1. taskchute ol が動的件数 aria-label を持つ
  const olRegex =
    /aria-label=\{`今日の task を時刻昇順で並べた 1 列 timeline \$\{ordered\.length\} 件`\}/
  if (olRegex.test(tc)) {
    findings.push({ level: 'info', message: `taskchute ol 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `taskchute ol 動的 aria-label 欠落` })
  }

  // 2. iter727 invariant: operation-board ItemList ariaLabel 維持
  const op = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  const hasIter727 = /iter727: Section 親は role="group" \+ aria-labelledby を持つが/.test(op)
  if (hasIter727) {
    findings.push({ level: 'info', message: `iter727 invariant: ItemList ariaLabel 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter727 invariant: 破壊` })
  }

  // 3. iter726 invariant: today-view 静的キーボードヒント aria-live なし維持
  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')
  if (/iter726: 静的キーボードヒントは aria-live="polite" の誤用/.test(tv)) {
    findings.push({ level: 'info', message: `iter726 invariant: today-view aria-live 削除維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter726 invariant: 破壊` })
  }

  // 4. iter724 invariant: top-items ol 維持
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

  // 5. iter723 invariant: workflow-runs ul 動的件数維持
  const wf = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`直近の実行履歴 \$\{runs\.length\} 件 \(最新順\)`\}/.test(wf)) {
    findings.push({ level: 'info', message: `iter723 invariant: workflow-runs ul 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter723 invariant: 破壊` })
  }

  console.log(`\n=== Findings (taskchute-ol-iter728) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
