/**
 * Phase 6.15 loop iter 601 (mode-D Desktop a11y) —
 * gantt-view "今日へジャンプ" button aria-label に target 日付埋込み (iter588 calendar
 * pattern を gantt jump-today に水平展開)。
 *
 * 課題: gantt-view.tsx 行 377-388 の gantt-jump-today button は aria-label が
 *   "Gantt timeline を今日の縦線まで横スクロール" の static で 「今日が何月何日」
 *   かを SR に伝えない。iter588 calendar 前日/翌日/今日リセット button と同 pattern
 *   で target 日付を埋込むと、SR ユーザは tab focus 中に jump 先日付を 1 phrase で
 *   確認可能。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label 動的化:
 *     `Gantt timeline を今日 (${format(new Date(), 'M月d日 (eee)')}) の縦線まで横スクロール`
 *
 * iter587-600 (動的 aria-label expose) pattern を gantt-jump-today に水平展開。
 *
 * 検証: source-side regex assert + iter515-600 invariant cross-check。
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

  // 1. gantt-jump-today aria-label に format(new Date()) 埋込み
  if (
    /aria-label=\{`Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`\}/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `gantt-jump-today aria-label 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-jump-today aria-label 動的化なし` })
  }

  // 2. iter600 invariant: sprint-risk item button aria-label 維持
  const srbw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-risk-board-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`\$\{entry\.item\.title\} を開く — risk score \$\{entry\.riskScore\}\$\{/.test(
      srbw,
    )
  ) {
    findings.push({ level: 'info', message: `iter600 invariant: sprint-risk 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter600 invariant: 破壊` })
  }

  // 3. iter599 invariant: dep-target empty-state hint 維持
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (/candidates\.length === 0\s*\n?\s*\?\s*'依存先 Item — 選択可能な候補がありません/.test(idp)) {
    findings.push({ level: 'info', message: `iter599 invariant: dep-target empty-state 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter599 invariant: 破壊` })
  }

  // 4. iter591 invariant: gantt zoom aria-label 維持
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `iter591 invariant: gantt zoom 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter591 invariant: 破壊` })
  }

  // 5. iter588 invariant: calendar nav prev button 維持
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`前日 \(\$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(cv)
  ) {
    findings.push({ level: 'info', message: `iter588 invariant: calendar prev 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter588 invariant: 破壊` })
  }

  // 6. iter587 invariant: gantt show-deps aria-label 維持
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter587 invariant: gantt show-deps 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter587 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-jump-today-aria-iter601) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
