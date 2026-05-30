/**
 * Phase 6.15 loop iter 588 (mode-D Desktop a11y) —
 * calendar-view 前日 / 翌日 / 今日リセット Button の aria-label に target 日付を埋込み。
 *
 * 課題: calendar-view.tsx 行 164-196 の prev/next/today reset Button は static aria-label
 *   ("前日" / "翌日" / "表示日を今日にリセット") のみで SR ユーザは tab navigation 中に
 *   「次にどの日付へ移動するか」が分からない。h2 aria-live で nav 後に変更後日付は読まれるが、
 *   tab focus 中 (まだ click 前) の preview がない。
 *
 * fix (1 ファイル ~3 行差分):
 *   - 前日: aria-label={`前日 (${format(subDays(date, 1), 'M月d日 (eee)')}) を表示`}
 *   - 翌日: aria-label={`翌日 (${format(addDays(date, 1), 'M月d日 (eee)')}) を表示`}
 *   - 今日: aria-label={`表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}
 *
 * iter587 (gantt-toggle aria-label 動的化) / iter530 (item-checkbox 動的 3-state) /
 * iter561 (sprint-retro 差分 dd 動的) pattern を calendar-nav button に水平展開。
 * Tab focus 時に SR ユーザが「次に行くと何月何日 (曜)」が事前に分かる。
 *
 * 検証: source-side regex assert + iter515-587 invariant cross-check。
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

  // 1. prev button: aria-label に subDays(date, 1) format で target 日付埋込み
  //    iter1496: () 区切 → em-dash 区切 (iter1093-1494 sweep に追従)
  if (
    /aria-label=\{`前日 — \$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\} を表示`\}/.test(cv)
  ) {
    findings.push({
      level: 'info',
      message: `calendar-view.tsx: prev button aria-label に target 日付埋込み OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view.tsx: prev button aria-label に target 日付埋込みなし`,
    })
  }

  // 2. next button: aria-label に addDays(date, 1) format で target 日付埋込み
  //    iter1496: () 区切 → em-dash 区切 (iter1093-1494 sweep に追従)
  if (
    /aria-label=\{`翌日 — \$\{format\(addDays\(date, 1\), 'M月d日 \(eee\)'\)\} を表示`\}/.test(cv)
  ) {
    findings.push({
      level: 'info',
      message: `calendar-view.tsx: next button aria-label に target 日付埋込み OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view.tsx: next button aria-label に target 日付埋込みなし`,
    })
  }

  // 3. today reset button: aria-label に new Date() format で target 日付埋込み
  if (
    /aria-label=\{`表示日を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) にリセット`\}/.test(
      cv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `calendar-view.tsx: today reset button aria-label に target 日付埋込み OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view.tsx: today reset button aria-label に target 日付埋込みなし`,
    })
  }

  // 4. iter587 invariant: gantt-view show-deps / hide-done aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(
      gv,
    ) &&
    /hideDone \? '完了済を隠している \(クリックで表示\)' : '完了済を隠す \(現在は表示中\)'/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter587 invariant: gantt-view show-deps + hide-done aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter587 invariant: 破壊`,
    })
  }

  // 5. iter586 invariant: proposal-edit-btn aria-label 維持
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`proposal-\$\{proposal\.id\}-edit-btn`\}\s*\n\s*aria-label=\{`提案「\$\{proposal\.title\}」を編集/.test(
      dpp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter586 invariant: proposal-edit-btn aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter586 invariant: 破壊`,
    })
  }

  console.log(`\n=== Findings (calendar-nav-aria-iter588) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
