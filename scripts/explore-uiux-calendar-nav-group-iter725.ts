/**
 * Phase 6.15 loop iter 725 (mode-D Desktop a11y) —
 * calendar-view 日付ナビゲーション row に role=group + aria-label 追加
 * (iter701-715 button group sweep の続き)。
 *
 * 課題: calendar-view.tsx 行 163 の `<div className="flex items-center gap-2">` は role / aria-label
 *   無し。前日 / 翌日 / 今日 の 3 button + h2 を含む navigation だが SR 不可視。
 *
 * fix (1 ファイル ~5 行差分):
 *   - row に `role="group"` + `aria-label="カレンダー日付ナビゲーション (前日 / 翌日 / 今日)"`
 *
 * 検証: source-side regex assert + iter701-724 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )

  // 1. calendar nav group + aria-label
  if (
    /role="group"\s*\n\s*aria-label="カレンダー日付ナビゲーション \(前日 \/ 翌日 \/ 今日\)"/.test(
      cv,
    )
  ) {
    findings.push({ level: 'info', message: `calendar nav group + aria-label OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar nav group + aria-label なし`,
    })
  }

  // 2. iter724 invariant: top-items ol 維持
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

  // 3. iter722 invariant: source-imports list 維持
  const ip = readFileSync(
    resolve(process.cwd(), 'src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`直近の Pull 履歴 \$\{imports\.length\} 件 \(最新順\)`\}/.test(ip)) {
    findings.push({ level: 'info', message: `iter722 invariant: source-imports 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter722 invariant: 破壊` })
  }

  // 4. iter716 invariant: pdca stats grid 維持
  const pdca = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/pdca-panel.tsx'),
    'utf8',
  )
  if (/aria-label="PDCA 4 段階の集計 \(Plan \/ Do \/ Check \/ Act\)"/.test(pdca)) {
    findings.push({ level: 'info', message: `iter716 invariant: pdca stats grid 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter716 invariant: 破壊` })
  }

  // 5. iter709 invariant: active-timer actions 維持
  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label="タスクタイマーの操作 \(一時停止 \/ 再開 \/ Picture-in-Picture \/ 停止\)"/.test(atp)
  ) {
    findings.push({ level: 'info', message: `iter709 invariant: active-timer actions 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter709 invariant: 破壊` })
  }

  console.log(`\n=== Findings (calendar-nav-group-iter725) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
