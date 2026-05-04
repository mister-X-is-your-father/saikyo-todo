/**
 * Phase 6.15 loop iter 773 (mode-D Desktop a11y) —
 * mock-login-form の email / password input に required + aria-required を追加、
 * Submit button に aria-busy を追加 (login-form / signup-form と整合)。
 *
 * 課題: mock-login-form.tsx 行 51-86 の IMEInput (email / password) は schema で
 *   required だが HTML required / aria-required 属性が無い。Submit button (行 88-96) も
 *   isPending 時に aria-busy が無い (login-form / signup-form は両方持つ)。Auth form 群の
 *   a11y attribute 統一性が崩れていた。
 *
 * fix (1 ファイル ~6 行差分):
 *   - email / password IMEInput に `required` + `aria-required="true"` 追加
 *   - Submit button に `aria-busy={isPending || undefined}` 追加
 *
 * 検証: source-side regex assert + iter735-772 invariant cross-check。
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
  // tsEmail required + aria-required
  if (
    /id="tsEmail"\s*\n\s*type="email"\s*\n\s*autoComplete="email"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      mlf,
    )
  ) {
    findings.push({ level: 'info', message: `mock-login tsEmail required + aria-required 追加 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login tsEmail required 追加 不完全`,
    })
  }
  // tsPassword required + aria-required
  if (
    /id="tsPassword"\s*\n\s*type="password"\s*\n\s*autoComplete="current-password"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-login tsPassword required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login tsPassword required 追加 不完全`,
    })
  }
  // Submit button aria-busy
  if (
    /disabled=\{isPending\}\s*\n\s*aria-busy=\{isPending \|\| undefined\}\s*\n\s*aria-label=\{isPending/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-login Submit button aria-busy 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-login Submit button aria-busy 追加 不完全`,
    })
  }

  // iter772 invariant: templates kind select required
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /id="tmpl-kind"\s*\n\s*value=\{kind\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter772 invariant: tmpl-kind select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter772 invariant: 破壊` })
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

  console.log(`\n=== Findings (mock-login-required-aria-busy-iter773) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
