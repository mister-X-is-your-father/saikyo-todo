/**
 * Phase 6.15 loop iter 789 (mode-D Desktop a11y) —
 * signup-form Submit button の pending state aria-label に functional context 追加。
 *
 * 課題: signup-form.tsx 行 152 の Submit button aria-label は idle state は
 *   "アカウントを作成 (サインアップ)" で functional context を持つが、
 *   pending state は "アカウント作成中…" のみで context が抜けている。
 *   iter765race で login-form は両 state ("ログイン中… (認証処理を実行中)" /
 *   "ログイン (メール + パスワードで認証)") に functional context が揃ったので、
 *   signup-form も対称に揃えるべき。
 *
 * fix (1 ファイル ~3 行差分):
 *   - aria-label pending state を 'アカウント作成中… (サインアップ処理を実行中)' に拡張
 *
 * 検証: source-side regex assert + iter735-788 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const sf = readFileSync(resolve(process.cwd(), 'src/components/auth/signup-form.tsx'), 'utf8')
  const hasPendingFunctional = /アカウント作成中… \(サインアップ処理を実行中\)/.test(sf)
  const hasIdleFunctional = /アカウントを作成 \(サインアップ\)/.test(sf)
  if (hasPendingFunctional && hasIdleFunctional) {
    findings.push({
      level: 'info',
      message: `signup-form Submit aria-label idle + pending 両 state functional context OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `signup-form Submit aria-label 不完全 (idle=${hasIdleFunctional} pending=${hasPendingFunctional})`,
    })
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

  // iter787 invariant: dep-target select required
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  const idpRequired = idp.match(/required\s*\n\s*aria-required="true"/g)?.length ?? 0
  if (idpRequired >= 2) {
    findings.push({
      level: 'info',
      message: `iter787 invariant: dep-kind + dep-target required 維持 OK (${idpRequired} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter787 invariant: 破壊` })
  }

  // iter752 invariant: backlog-view empty state
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/role="status"\s*\n\s*aria-live="polite"/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter752 invariant: backlog-view empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter752 invariant: 破壊` })
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

  console.log(`\n=== Findings (signup-pending-aria-label-iter789) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
