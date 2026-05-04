/**
 * Phase 6.15 loop iter 774 (mode-D Desktop a11y) —
 * mock-submit-form Submit button に aria-busy を追加。
 * iter773 mock-login と同 pattern を mock-submit form に展開。
 *
 * 課題: mock-submit-form.tsx 行 154-160 の Submit button は disabled={isPending} を
 *   持つが aria-busy が無い。iter773 で mock-login Submit に aria-busy 追加した
 *   のを mock-submit にも展開して mock-timesheet form 群を統一。
 *
 * fix (1 ファイル ~1 行差分):
 *   - Submit button に `aria-busy={isPending || undefined}` 追加
 *
 * 検証: source-side regex assert + iter735-773 invariant cross-check。
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
  if (
    /disabled=\{isPending\}\s*\n\s*aria-busy=\{isPending \|\| undefined\}\s*\n\s*className="h-11 w-full"/.test(
      msf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `mock-submit Submit button aria-busy 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `mock-submit Submit button aria-busy 追加 不完全`,
    })
  }

  // iter773 invariant: mock-login required + aria-busy
  const mlf = readFileSync(
    resolve(process.cwd(), 'src/components/mock-timesheet/mock-login-form.tsx'),
    'utf8',
  )
  if (
    /id="tsEmail"\s*\n\s*type="email"\s*\n\s*autoComplete="email"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      mlf,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter773 invariant: mock-login required attribute 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter773 invariant: 破壊` })
  }

  // iter772 invariant: tmpl-kind select required
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /id="tmpl-kind"\s*\n\s*value=\{kind\}/.test(tp) &&
    /required\s*\n\s*aria-required="true"/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter772 invariant: tmpl-kind select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter772 invariant: 破壊` })
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

  console.log(`\n=== Findings (mock-submit-aria-busy-iter774) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
