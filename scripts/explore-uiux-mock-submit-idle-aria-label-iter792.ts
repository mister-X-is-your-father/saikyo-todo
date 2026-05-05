/**
 * Phase 6.15 loop iter 792 (mode-D Desktop a11y) —
 * mock-submit-form Submit button idle state aria-label に functional context 追加
 * (mock-timesheet form 群統一性の最終 cleanup)。
 *
 * 課題: mock-submit-form.tsx 行 152-161 の Submit button aria-label は pending state
 *   ('送信中… (mock-timesheet 工数送信処理を実行中)') は functional context を持つが、
 *   idle state は undefined で visible text "送信" のみ。SR ユーザは button が
 *   何の送信 (mock-timesheet 工数送信) か idle 時に分からなかった。
 *   iter765race (login-form) / iter789 (signup-form) / iter790 (mock-login-form)
 *   と同 pattern で auth + mock-timesheet form 群の Submit aria-label 統一性を完成。
 *
 * fix (1 ファイル ~5 行差分):
 *   - aria-label idle state を '工数を送信 (mock-timesheet 入力フォーム)' に拡張
 *
 * 検証: source-side regex assert + iter735-791 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const msf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-submit-form.tsx'),
    'utf8',
  )
  const hasIdleFunctional = /'工数を送信 \(mock-timesheet 入力フォーム\)'/.test(msf)
  const hasPendingFunctional = /'送信中… \(mock-timesheet 工数送信処理を実行中\)'/.test(msf)
  if (hasIdleFunctional && hasPendingFunctional) {
    findings.push({
      level: 'info',
      message: `mock-submit-form Submit aria-label idle + pending 両 state functional context OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit-form Submit aria-label 不完全 (idle=${hasIdleFunctional} pending=${hasPendingFunctional})`,
    })
  }

  // iter791 invariant: decompose-proposals DoD aria-label dynamic
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/提案 DoD \(MUST 必須、最大 2000 文字、完了条件を具体記述\)/.test(dpp)) {
    findings.push({
      level: 'info',
      message: `iter791 invariant: decompose-proposals DoD aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter791 invariant: 破壊` })
  }

  // iter790 invariant: mock-login-form Submit idle aria-label
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (/'ログイン \(mock-timesheet email \+ password で認証\)'/.test(mlf)) {
    findings.push({
      level: 'info',
      message: `iter790 invariant: mock-login-form Submit idle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter790 invariant: 破壊` })
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

  console.log(`\n=== Findings (mock-submit-idle-aria-label-iter792) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
