/**
 * Phase 6.15 loop iter 852 (mode-D Desktop a11y / iter826+ pattern catch-up) —
 * mock-timesheet login submit button visible text を aria-hidden span に統合。
 *
 * 課題: src/components/mock-timesheet/mock-login-form.tsx の submit Button は
 *   visible text "認証中..." / "ログイン" を直接 children に出していたが、
 *   aria-label ("認証中… (mock-timesheet 認証処理を実行中)" /
 *   "ログイン (mock-timesheet email + password で認証)") が visible を完全包含するのに
 *   aria-hidden 無し → 一部 SR / 旧 browser で children が再 announce される
 *   anti-pattern (iter826/iter844-848 で確立した「visible aria-hidden 統一」 規約に未追従)。
 *
 * fix (1 ファイル 1 行差分、ASCII "..." → Unicode "…" 同時統一):
 *   - 旧: {isPending ? '認証中...' : 'ログイン'}
 *   - 新: <span aria-hidden="true">{isPending ? '認証中…' : 'ログイン'}</span>
 *
 * 検証: source-side regex assert + iter851/844/843/841/735 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ml = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{isPending \? '認証中…' : 'ログイン'\}<\/span>/.test(ml)) {
    findings.push({
      level: 'info',
      message: `mock-timesheet login submit visible text aria-hidden span 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-timesheet login submit visible text aria-hidden 未統合`,
    })
  }
  // aria-label が壊れていないこと
  if (
    /'認証中… \(mock-timesheet 認証処理を実行中\)'\s*:\s*'ログイン \(mock-timesheet email \+ password で認証\)'/.test(
      ml,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-timesheet login submit aria-label 維持 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-timesheet login submit aria-label 破壊`,
    })
  }
  // 旧 ASCII '...' が残っていないこと
  if (/'認証中\.\.\.'/.test(ml)) {
    findings.push({
      level: 'warning',
      message: `mock-timesheet login submit に ASCII '...' が残存`,
    })
  } else {
    findings.push({
      level: 'info',
      message: `mock-timesheet login submit ellipsis Unicode '…' 統一 OK`,
    })
  }

  // iter851 invariant: skip-link focus min-h-11
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

  // iter844 invariant: login-form submit aria-hidden span
  const lf = readFileSync(resolve(process.cwd(), 'src/components/auth/login-form.tsx'), 'utf8')
  if (/<span aria-hidden="true">\{isPending \? 'ログイン中…' : 'ログイン'\}<\/span>/.test(lf)) {
    findings.push({
      level: 'info',
      message: `iter844 invariant: login-form submit aria-hidden span 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter844 invariant: 破壊` })
  }

  // iter843 invariant: item-edit-dialog reload button aria-hidden
  const ied = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">最新を読み込み<\/span>/.test(ied)) {
    findings.push({
      level: 'info',
      message: `iter843 invariant: item-edit-dialog reload button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter843 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor aria-keyshortcuts
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

  console.log(`\n=== Findings (mock-timesheet-login-aria-hidden-iter852) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
