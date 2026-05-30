/**
 * Phase 6.15 loop iter 602 (mode-D Desktop a11y) —
 * gantt-view today line div aria-label に target 日付埋込み (visible 表記との整合)。
 *
 * 課題: gantt-view.tsx 行 403-407 の gantt-today-line div は aria-label が "今日"
 *   の static で 「今日が何月何日」 を SR に伝えない。visible には "今日" badge
 *   が表示されるが、その badge も同じく "今日" のみで日付情報なし。SR ユーザは
 *   line の存在は分かるが日付が分からない。iter601 (gantt-jump-today button) と
 *   pair で aria-label に日付を埋込み。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label 動的化:
 *     `今日 (${format(new Date(), 'yyyy年M月d日 (eee)')}) の縦線`
 *
 * iter587-601 (動的 aria-label expose) pattern を gantt today line に水平展開。
 *
 * 検証: source-side regex assert + iter515-601 invariant cross-check。
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

  // 1. gantt-today-line aria-label に format(new Date()) 埋込み
  if (
    /aria-label=\{`今日 \(\$\{format\(new Date\(\), 'yyyy年M月d日 \(eee\)'\)\}\) の縦線`\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `gantt-today-line aria-label 動的化 OK` })
  } else {
    findings.push({ level: 'warning', message: `gantt-today-line aria-label 動的化なし` })
  }

  // 2. iter601 invariant: gantt-jump-today aria-label 維持
  if (
    /aria-label=\{`Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`\}/.test(
      gv,
    )
  ) {
    findings.push({ level: 'info', message: `iter601 invariant: gantt-jump-today 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter601 invariant: 破壊` })
  }

  // 3. iter600 invariant: sprint-risk item button aria-label 維持
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

  // 4. iter591 invariant: gantt zoom aria-label 維持
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `iter591 invariant: gantt zoom 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter591 invariant: 破壊` })
  }

  // 5. iter588 invariant: calendar prev button 維持
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

  console.log(`\n=== Findings (gantt-today-line-aria-iter602) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
