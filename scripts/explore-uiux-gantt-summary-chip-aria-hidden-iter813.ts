/**
 * Phase 6.15 loop iter 813 (mode-D Desktop a11y) —
 * gantt-view summary banner critical / slip chip 内 visible text を aria-hidden span で wrap。
 *
 * 課題: gantt-view.tsx 行 320-345 の 2 chip (critical path / 遅延) は parent <span> に
 *   aria-label が完全 content を含むのに、内側 visible text は aria-hidden 無し。
 *   iter800-812 sweep の続編。
 *
 * fix (1 ファイル ~6 行差分、2 chip 各々の visible text を aria-hidden span に wrap)。
 *
 * 検証: source-side regex assert + iter735-812 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  const hasCriticalAriaHidden =
    /aria-label=\{`critical path[\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv)
  const hasSlipAriaHidden =
    /aria-label=\{`遅延 [\s\S]*?\}\s*\n\s*>\s*\n\s*<span aria-hidden="true">/.test(gv)
  if (hasCriticalAriaHidden && hasSlipAriaHidden) {
    findings.push({
      level: 'info',
      message: `gantt-view summary critical + slip chip 内 visible text aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `gantt-view chip aria-hidden 不完全 (critical=${hasCriticalAriaHidden} slip=${hasSlipAriaHidden})`,
    })
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

  // iter800 invariant: tag-picker trigger inner aria-hidden
  const tp = readFileSync(resolve(process.cwd(), 'src/components/workspace/tag-picker.tsx'), 'utf8')
  if (
    /<span className="text-muted-foreground" aria-hidden="true">\s*\n?\s*タグなし\s*\n?\s*<\/span>/.test(
      tp,
    ) &&
    /<span className="flex flex-wrap gap-1" aria-hidden="true">/.test(tp)
  ) {
    findings.push({
      level: 'info',
      message: `iter800 invariant: tag-picker trigger inner aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter800 invariant: 破壊` })
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

  console.log(`\n=== Findings (gantt-summary-chip-aria-hidden-iter813) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
