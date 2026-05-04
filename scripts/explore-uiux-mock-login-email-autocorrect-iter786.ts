/**
 * Phase 6.15 loop iter 786 (mode-D Desktop a11y) —
 * mock-login-form email IMEInput に inputMode + autoCorrect + autoCapitalize +
 * spellCheck を追加 (login-form / signup-form と整合性)。
 *
 * 課題: mock-login-form.tsx 行 51-65 の email IMEInput は login-form / signup-form と比較して
 *   inputMode / autoCorrect / autoCapitalize / spellCheck が抜けている。これらは email 入力
 *   時の autocorrect 誤動作を防ぎ、mobile で email keypad を呼び出す。a11y attribute では
 *   ないが、UX 統一性として auth form 群を揃える。
 *
 * fix (1 ファイル ~4 行差分):
 *   - inputMode="email" + autoCorrect="off" + autoCapitalize="none" + spellCheck={false} 追加
 *
 * 検証: source-side regex assert + iter735-785 invariant cross-check。
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
  if (
    /inputMode="email"\s*\n\s*autoCorrect="off"\s*\n\s*autoCapitalize="none"\s*\n\s*spellCheck=\{false\}/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-login-form email IMEInput に inputMode + autoCorrect + autoCapitalize + spellCheck 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login-form email autoCorrect 追加 不完全`,
    })
  }

  // iter785 invariant: wf-node-error pre role=alert
  const wfp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid=\{`wf-node-run-error-\$\{nr\.id\}`\}\s*\n\s*aria-label=\{`node \$\{nr\.nodeId\} のエラー`\}\s*\n\s*role="alert"/.test(
      wfp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter785 invariant: wf-node-error pre role="alert" 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter785 invariant: 破壊` })
  }

  // iter784 invariant: dep-kind select required
  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    /value=\{pickKind\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="rounded border px-2 py-1\.5 text-sm"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter784 invariant: dep-kind select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter784 invariant: 破壊` })
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

  console.log(`\n=== Findings (mock-login-email-autocorrect-iter786) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
