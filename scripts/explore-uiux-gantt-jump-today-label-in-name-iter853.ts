/**
 * Phase 6.15 loop iter 853 (mode-D Desktop a11y) —
 * gantt-view 今日へジャンプ button: WCAG 2.5.3 (Label in Name) 適合。
 *
 * 課題: src/components/workspace/gantt-view.tsx の jump-today button は visible
 *   "今日へジャンプ" が旧 aria-label "Gantt timeline を今日 (M月d日 (eee)) の縦線まで
 *   横スクロール" 内に substring としても含まれない (visible は「今日へジャンプ」、
 *   accessible name は「Gantt timeline を…」 で起点) → WCAG 2.5.3 (Label in Name)
 *   直接違反。voice user 発話 "今日へジャンプ" でこの button に到達不可。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label を「今日へジャンプ (Gantt timeline を M月d日 (eee) の縦線まで横スクロール)」
 *     prefix 形に変更し、visible "今日へジャンプ" を name 先頭に含める (label-in-name 適合)。
 *   - 同時に visible "今日へジャンプ" を <span aria-hidden="true"> で wrap、aria-label
 *     単独経路に統一 (iter844-852 と一貫)。
 *
 * 検証: source-side regex assert + iter850/851/852 invariant cross-check。
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

  // 1. jump-today aria-label に visible "今日へジャンプ" prefix
  if (
    /aria-label=\{`今日へジャンプ \(Gantt timeline を \$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\} の縦線まで横スクロール\)`\}/.test(
      gv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `gantt jump-today aria-label に visible "今日へジャンプ" prefix (WCAG 2.5.3 適合) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt jump-today aria-label が visible prefix を含まない`,
    })
  }

  // 2. visible "今日へジャンプ" は span aria-hidden で wrap
  if (
    /data-testid="gantt-jump-today"[\s\S]+?<span aria-hidden="true">今日へジャンプ<\/span>/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `gantt jump-today visible "今日へジャンプ" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt jump-today visible "今日へジャンプ" aria-hidden 未統合`,
    })
  }

  // 3. data-testid + title 維持
  if (/data-testid="gantt-jump-today"/.test(gv) && /title="今日の縦線まで横スクロール"/.test(gv)) {
    findings.push({
      level: 'info',
      message: `gantt jump-today data-testid + title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `gantt jump-today attrs 破壊` })
  }

  // iter852 invariant: bulk-clear visible "解除" span aria-hidden 維持
  const bab = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (/data-testid="bulk-clear"[\s\S]+?<span aria-hidden="true">解除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: bulk-clear visible "解除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant: bulk-status visible "{s.label} に" span aria-hidden 維持
  if (/<span aria-hidden="true">\{s\.label\} に<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: bulk-status visible "{s.label} に" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  // iter850 invariant: bulk-delete visible "削除" span aria-hidden 維持
  if (/<span aria-hidden="true">削除<\/span>/.test(bab)) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: bulk-delete visible "削除" aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter850 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view 今日 button aria-hidden
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

  console.log(`\n=== Findings (gantt-jump-today-label-in-name-iter853) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
