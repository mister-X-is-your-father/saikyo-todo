/**
 * Phase 6.15 loop iter 849 (mode-D Desktop a11y) —
 * calendar-view 「今日」 button visible text を aria-hidden span で wrap。
 *
 * 課題: calendar-view.tsx 行 195-200 の Today reset Button visible text "今日" は
 *   aria-label `表示日を今日 (M月d日 (eee)) にリセット` が完全 content を含むのに
 *   aria-hidden 無し → SR は visible "今日" + aria-label の 2 経路で読み上げ重複。
 *   Calendar / Schedule 画面の主要 navigation control。
 *
 * fix (1 ファイル ~1 行差分):
 *   - visible text "今日" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter844-848 invariant cross-check。
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
  if (/<span aria-hidden="true">今日<\/span>/.test(cv)) {
    findings.push({
      level: 'info',
      message: `calendar-view today button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `calendar-view today button aria-hidden 不完全`,
    })
  }

  // calendar-today-btn invariant: data-testid + aria-label + min-h-11
  if (
    /data-testid="calendar-today-btn"/.test(cv) &&
    /aria-label=\{`表示日を今日 \(\$\{format\(new Date\(\), 'M月d日 \(eee\)'\)\}\) にリセット`\}/.test(
      cv,
    ) &&
    /className="min-h-11"/.test(cv)
  ) {
    findings.push({
      level: 'info',
      message: `calendar-today-btn invariant: data-testid + aria-label + min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `calendar-today-btn invariant: 破壊` })
  }

  // calendar-prev / next icon-only Button aria-label invariant 維持
  if (
    /aria-label=\{`前日 \(\$\{format\(subDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(
      cv,
    ) &&
    /aria-label=\{`翌日 \(\$\{format\(addDays\(date, 1\), 'M月d日 \(eee\)'\)\}\) を表示`\}/.test(cv)
  ) {
    findings.push({
      level: 'info',
      message: `calendar-prev/next icon-only Button aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `calendar-prev/next aria-label invariant: 破壊` })
  }

  // iter848 invariant: quick-add submit button aria-hidden
  const qa = readFileSync(resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '作成'\}<\/span>/.test(qa)) {
    findings.push({
      level: 'info',
      message: `iter848 invariant: quick-add submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter848 invariant: 破壊` })
  }

  // iter847 invariant: create-workspace-form submit button aria-hidden
  const cwf = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '作成中\.\.\.' : '作成'\}<\/span>/.test(cwf)) {
    findings.push({
      level: 'info',
      message: `iter847 invariant: create-workspace-form submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter847 invariant: 破壊` })
  }

  // iter844 invariant: async-states ErrorState retry button aria-hidden
  const asyncStates = readFileSync(
    resolve(process.cwd(), 'src/components/shared/async-states.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">再試行<\/span>/.test(asyncStates)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: async-states ErrorState retry aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  console.log(`\n=== Findings (calendar-today-btn-aria-hidden-iter849) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
