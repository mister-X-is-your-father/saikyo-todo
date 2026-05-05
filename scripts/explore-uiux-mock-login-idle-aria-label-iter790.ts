/**
 * Phase 6.15 loop iter 790 (mode-D Desktop a11y) —
 * mock-login-form Submit button idle state aria-label に functional context 追加。
 *
 * 課題: mock-login-form.tsx 行 96-105 の Submit button aria-label は pending state
 *   ('認証中… (mock-timesheet 認証処理を実行中)') は functional context を持つが、
 *   idle state は undefined で visible text "ログイン" のみ。SR ユーザは button が
 *   何の認証経路 (mock-timesheet vs login-form) か分からない。iter765race の
 *   login-form / iter789 の signup-form と同 pattern で揃えるべき。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label idle state を 'ログイン (mock-timesheet email + password で認証)' に拡張
 *
 * 検証: source-side regex assert + iter735-789 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  const hasIdleFunctional = /'ログイン \(mock-timesheet email \+ password で認証\)'/.test(mlf)
  const hasPendingFunctional = /'認証中… \(mock-timesheet 認証処理を実行中\)'/.test(mlf)
  if (hasIdleFunctional && hasPendingFunctional) {
    findings.push({
      level: 'info',
      message: `mock-login-form Submit aria-label idle + pending 両 state functional context OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login-form Submit aria-label 不完全 (idle=${hasIdleFunctional} pending=${hasPendingFunctional})`,
    })
  }

  // iter789 invariant: signup-form Submit pending state functional context
  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  if (/アカウント作成中… \(サインアップ処理を実行中\)/.test(sf)) {
    findings.push({
      level: 'info',
      message: `iter789 invariant: signup-form Submit pending functional context 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter789 invariant: 破壊` })
  }

  // iter788 invariant: workspace-mode-selector aria-describedby
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (/aria-describedby="workspace-mode-hint"/.test(wms) && /id="workspace-mode-hint"/.test(wms)) {
    findings.push({
      level: 'info',
      message: `iter788 invariant: workspace-mode-selector hint 連携 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter788 invariant: 破壊` })
  }

  // iter786 invariant: mock-login email autoCorrect
  if (
    /inputMode="email"\s*\n\s*autoCorrect="off"\s*\n\s*autoCapitalize="none"\s*\n\s*spellCheck=\{false\}/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter786 invariant: mock-login email autoCorrect 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter786 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
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

  console.log(`\n=== Findings (mock-login-idle-aria-label-iter790) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
