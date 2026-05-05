/**
 * Phase 6.15 loop iter 816 (mode-D Desktop a11y) —
 * backlog-view 見積サマリ chip 内 visible {estimateSummary} を aria-hidden span で wrap。
 *
 * 課題: backlog-view.tsx 行 280-287 の estimate summary chip は parent span に
 *   aria-label "Backlog 見積サマリ: ${estimateSummary}" が付いているのに、内側
 *   visible {estimateSummary} span は aria-hidden 無しで重複読み上げ。iter800-815 sweep
 *   の続編。
 *
 * fix (1 ファイル ~1 行差分):
 *   - <span>{estimateSummary}</span> を <span aria-hidden="true">{estimateSummary}</span> に変更
 *
 * 検証: source-side regex assert + iter735-815 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  const hasAriaHidden = /<span aria-hidden="true">\{estimateSummary\}<\/span>/.test(bv)
  if (hasAriaHidden) {
    findings.push({
      level: 'info',
      message: `backlog-view estimate summary chip 内 visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `backlog-view estimate summary chip aria-hidden 不完全`,
    })
  }

  // iter815 invariant: template card button aria-label kind/cron
  const tp = readFileSync(
    resolve(process.cwd(), 'src/components/template/templates-panel.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Template「\$\{t\.name\}」\(\$\{t\.kind\}\$\{t\.scheduleCron \? ` · \$\{t\.scheduleCron\}` : ''\}\)/.test(
      tp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter815 invariant: template card button aria-label kind/cron 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter815 invariant: 破壊` })
  }

  // iter814 invariant: workspace-header role Badge aria-hidden
  const wh = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-header.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{role\}<\/span>/.test(wh)) {
    findings.push({
      level: 'info',
      message: `iter814 invariant: workspace-header role Badge aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter814 invariant: 破壊` })
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

  console.log(`\n=== Findings (backlog-estimate-summary-aria-hidden-iter816) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
