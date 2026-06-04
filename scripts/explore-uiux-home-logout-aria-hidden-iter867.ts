/**
 * Phase 6.15 loop iter 867 (mode-D Desktop a11y) —
 * src/app/page.tsx (home page) の ログアウト button visible "ログアウト" を
 * <span aria-hidden="true"> で wrap し、aria-label 単独経路に統一。
 *
 * 経緯: iter844-866 sweep の続編。home page header の ログアウト button は
 *   aria-label "ログアウトしてログイン画面に戻る" 完全 content を含むのに
 *   visible "ログアウト" は aria-hidden 無し → SR 二重読み上げ。
 *   mock-timesheet の同 button は既に span aria-hidden 化済 → home も統一。
 *
 * 修正: visible "ログアウト" を <span aria-hidden="true"> で wrap、
 *   aria-label 単独経路に統一。
 *
 * 検証: source-side regex assert + iter735/843/849-866 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const home = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')

  // 1. visible "ログアウト" を span aria-hidden で wrap
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(home)) {
    findings.push({
      level: 'info',
      message: `home page logout button visible "ログアウト" aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home page logout visible aria-hidden 未統合`,
    })
  }

  // 2. aria-label 維持
  //    iter1724: em-dash visible-prefix convention に migration、regex 追従。
  if (/aria-label="ログアウト — ログイン画面に戻る"/.test(home)) {
    findings.push({
      level: 'info',
      message: `home page logout aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home page logout aria-label 破壊`,
    })
  }

  // 3. mock-timesheet 同 button aria-hidden 維持 (parallel pattern)
  const mtn = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(mtn)) {
    findings.push({
      level: 'info',
      message: `mock-timesheet logout aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-timesheet logout 破壊` })
  }

  // 4. data-testid + form action 維持
  if (
    /data-testid="logout-btn"/.test(home) &&
    /aria-label="ログアウト"/.test(home) &&
    /logoutAction/.test(home)
  ) {
    findings.push({
      level: 'info',
      message: `home page logout form 構造 + data-testid 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `home page logout form / data-testid 破壊`,
    })
  }

  // iter866 invariant: subtasks-panel bulk-add aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">[\s\S]+?create\.isPending \? '追加中…'[\s\S]+?<\/span>/.test(sp)) {
    findings.push({
      level: 'info',
      message: `iter866 invariant: subtasks-panel bulk-add aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter866 invariant: 破壊` })
  }

  // iter865 invariant
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{archive\.isPending \? 'アーカイブ中…' : 'アーカイブ'\}<\/span>/.test(
      ied,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter865 invariant: item-edit-dialog footer aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter865 invariant: 破壊` })
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

  console.log(`\n=== Findings (home-logout-aria-hidden-iter867) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
