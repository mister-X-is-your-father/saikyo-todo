/**
 * Phase 6.15 loop iter 772 (mode-D Desktop a11y) —
 * templates-panel tmpl-kind select に required + aria-required を追加。
 * iter770/iter771 と同 pattern を Template kind select に展開。
 *
 * 課題: templates-panel.tsx 行 122-137 の Template 種別 select は実質 required
 *   (manual / recurring の 2 択必須) だが HTML required / aria-required 属性が無い。
 *
 * fix (1 ファイル ~2 行差分):
 *   - select に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-771 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

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
      message: `templates-panel tmpl-kind select required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `templates-panel tmpl-kind select required 追加 不完全`,
    })
  }

  // iter771 invariant: goals-panel KR mode select required
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /value=\{mode\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="rounded border px-2 py-1 text-xs"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter771 invariant: goals-panel KR mode select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter771 invariant: 破壊` })
  }

  // iter770 invariant: sprint-defaults-dow select required
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /id="sprint-defaults-dow"\s*\n\s*value=\{dow\}\s*\n\s*onChange=\{[^}]+\}\s*\n\s*className="[^"]+"\s*\n\s*required\s*\n\s*aria-required="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter770 invariant: sprint-defaults-dow select required 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter770 invariant: 破壊` })
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

  console.log(`\n=== Findings (tmpl-kind-required-iter772) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
