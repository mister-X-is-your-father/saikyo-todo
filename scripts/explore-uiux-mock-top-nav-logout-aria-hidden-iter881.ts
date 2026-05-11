/**
 * Phase 6.15 loop iter 881 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * mock-top-nav.tsx の ログアウト Button visible を aria-hidden span に統合。
 *
 * 課題: src/components/mock-timesheet/mock-top-nav.tsx の line 33 ログアウト Button は
 *   visible "ログアウト" 直接 children だが、aria-label "mock-timesheet session をログアウト"
 *   完全 content 包含 → SR 再 announce、mock-timesheet 認証 path で頻繁。
 *
 * fix (1 ファイル 1 行差分):
 *   - <span aria-hidden="true">ログアウト</span> で wrap
 *
 * 検証: source-side regex assert + iter880/879/878/851 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const mt = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">ログアウト<\/span>/.test(mt)) {
    findings.push({
      level: 'info',
      message: `mock-top-nav ログアウト Button aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `mock-top-nav ログアウト 未統合` })
  }

  // iter880 invariant: subpages back-link
  const sp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (
    /aria-label="Workspace ホームへ戻る"/.test(sp) &&
    /<span aria-hidden="true">← Workspace<\/span>/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter880 invariant: subpages back-link 維持 OK (sprints sample)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter880 invariant: 破壊` })
  }

  // iter852 invariant: mock-timesheet login
  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '認証中…' : 'ログイン'\}<\/span>/.test(ml)) {
    findings.push({
      level: 'info',
      message: `iter852 invariant: mock-timesheet login 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter852 invariant: 破壊` })
  }

  // iter851 invariant
  const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')
  if (
    /focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11/.test(
      layout,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter851 invariant: skip-link focus min-h-11 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter851 invariant: 破壊` })
  }

  console.log(`\n=== Findings (mock-top-nav-logout-aria-hidden-iter881) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
