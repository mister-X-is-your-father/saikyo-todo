/**
 * Phase 6.15 loop iter 868 (mode-D Desktop a11y) —
 * gantt-view の 「今日へジャンプ」 button visible "今日へジャンプ" を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-867 sweep の続編。Gantt timeline 上部の「今日へジャンプ」 button は
 *   aria-label "Gantt timeline を今日 (M月d日 (eee)) の縦線まで横スクロール" 完全 content
 *   を含むのに visible "今日へジャンプ" は aria-hidden 無し → SR 二重読み上げ。
 *   iter849 calendar-view 「今日」 reset button と同 pattern で wrap。
 *
 * 修正: visible "今日へジャンプ" を <span aria-hidden="true"> で wrap、aria-label 単独経路に統一。
 *   既存 iter507 tap target pseudo / title attr 維持。
 *
 * 検証: source-side regex assert + iter735/843/849-867 invariant cross-check。
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

  // 1. visible "今日へジャンプ" を span aria-hidden で wrap
  if (/<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt-view jump-today button visible "今日へジャンプ" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view jump-today visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 完全 content 維持 (動的日付)
  if (
    /aria-label=\{`Gantt timeline を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) の縦線まで横スクロール`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view jump-today aria-label 動的日付込み完全 content 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view jump-today aria-label 破壊`,
    })
  }

  // 3. iter507 tap target pseudo + data-testid 維持
  if (
    /data-testid="gantt-jump-today"/.test(gv) &&
    /before:-inset-3/.test(gv) &&
    /title="今日の縦線まで横スクロール"/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt-view jump-today data-testid + iter507 tap target + title 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view jump-today attrs 破壊`,
    })
  }

  // iter867 invariant: home page logout aria-hidden
  const home = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(home)) {
    findings.push({
      level: 'info',
      message: `iter867 invariant: home page logout aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter867 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 今日 reset button aria-hidden
  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view 今日 button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (gantt-jump-today-aria-hidden-iter868) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
