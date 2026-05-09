/**
 * Phase 6.15 loop iter 851 (mode-D Desktop a11y) —
 * login page footer signup-link visible "サインアップ" を aria-hidden span で wrap。
 *
 * 課題: src/app/(auth)/login/page.tsx の signup-link `<Link>` は
 *   aria-label="アカウントをお持ちでない方はこちらでサインアップ" が完全 content
 *   を含むのに、visible "サインアップ" は aria-hidden 無し。SR は visible +
 *   aria-label の 2 経路で読み上げ重複 (iter844 / iter845 / iter848 / iter849 /
 *   iter850 と同 vocabulary)。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">サインアップ</span> で wrap、aria-label 単独経路。
 *
 * 検証: source-side regex assert + iter844 / iter848 / iter849 / iter850
 *   invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const loginPage = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8')

  // iter851 fix: signup-link visible aria-hidden
  if (
    /data-testid="signup-link"[\s\S]*?<span aria-hidden="true">サインアップ<\/span>/.test(loginPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter851: signup-link visible "サインアップ" を aria-hidden span で wrap OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter851: signup-link visible aria-hidden 不完全`,
    })
  }

  // iter851 invariant: aria-label / data-testid / href 維持
  if (
    /aria-label="アカウントをお持ちでない方はこちらでサインアップ"/.test(loginPage) &&
    /data-testid="signup-link"/.test(loginPage) &&
    /href="\/signup"/.test(loginPage)
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: signup-link aria-label + data-testid + href 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: signup-link 属性破壊` })
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

  // iter848 invariant: quick-add submit aria-hidden
  const quickAdd = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/quick-add.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">/.test(quickAdd)) {
    findings.push({
      level: 'info',
      message: `iter848 invariant: quick-add submit aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter848 invariant: 破壊` })
  }

  // iter849 invariant: calendar-view today button aria-hidden
  const calendarView = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">今日<\/span>/.test(calendarView)) {
    findings.push({
      level: 'info',
      message: `iter849 invariant: calendar-view today button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter849 invariant: 破壊` })
  }

  // iter850 invariant: item-edit-dialog 6 TabsTrigger aria-hidden (基本 / サマリ / 子タスク / 依存 / コメント / アクティビティ)
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  const ahCount = (ied.match(/<span aria-hidden="true">/g) ?? []).length
  if (ahCount >= 6) {
    findings.push({
      level: 'info',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (>=6) OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter850 invariant: item-edit-dialog aria-hidden span count=${ahCount} (<6) 破壊`,
    })
  }

  console.log(`\n=== Findings (login-signup-link-aria-hidden-iter851) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
