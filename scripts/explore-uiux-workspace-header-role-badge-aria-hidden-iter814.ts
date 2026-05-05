/**
 * Phase 6.15 loop iter 814 (mode-D Desktop a11y) —
 * workspace-header role Badge 内 visible {role} を aria-hidden span で wrap。
 *
 * 課題: workspace-header.tsx 行 29-35 の role Badge は parent Badge に
 *   aria-label が付いているのに、内部 visible {role} text は aria-hidden 無し。
 *   iter800-813 sweep の続編 (Badge inner aria-hidden pattern)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - {role} を <span aria-hidden="true">{role}</span> に変更
 *
 * 検証: source-side regex assert + iter735-813 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  const hasRoleAriaHidden = /<span aria-hidden="true">\{role\}<\/span>/.test(wh)
  if (hasRoleAriaHidden) {
    findings.push({
      level: 'info',
      message: `workspace-header role Badge 内 visible {role} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `workspace-header role Badge aria-hidden 不完全`,
    })
  }

  // iter813 invariant: gantt-view summary chip aria-hidden
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    /aria-label=\{`critical path[\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv) &&
    /aria-label=\{`遅延 [\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv)
  ) {
    findings.push({
      level: 'info',
      message: `iter813 invariant: gantt summary chip aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter813 invariant: 破壊` })
  }

  // iter812 invariant: must-badge MUST aria-hidden
  const mb = readFileSync(resolve(process.cwd(), 'src/components/workspace/must-badge.tsx'), 'utf8')
  if (
    /<span aria-hidden="true">MUST<\/span>/.test(mb) &&
    /<span className="sr-only">MUST<\/span>/.test(mb)
  ) {
    findings.push({
      level: 'info',
      message: `iter812 invariant: must-badge MUST aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter812 invariant: 破壊` })
  }

  // iter811 invariant: status-badge shortLabel aria-hidden
  const sb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{cfg\.shortLabel\}<\/span>/.test(sb) &&
    /<span className="sr-only">\{cfg\.shortLabel\}<\/span>/.test(sb)
  ) {
    findings.push({
      level: 'info',
      message: `iter811 invariant: status-badge shortLabel aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter811 invariant: 破壊` })
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

  console.log(`\n=== Findings (workspace-header-role-badge-aria-hidden-iter814) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
