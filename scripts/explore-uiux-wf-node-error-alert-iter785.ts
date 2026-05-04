/**
 * Phase 6.15 loop iter 785 (mode-D Desktop a11y) —
 * workflows-panel WorkflowNodeRunsList の error <pre> に role="alert" を追加。
 *
 * 課題: workflows-panel.tsx 行 864-872 の error <pre> は aria-label を持つが role が無い。
 *   workflow node run の失敗 error は user の attention 必須情報なので、SR が
 *   automatic announce する role="alert" が適切 (WCAG 4.1.3 Status Messages)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - error <pre> に `role="alert"` 追加
 *
 * 検証: source-side regex assert + iter735-784 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

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
      message: `wf-node-run-error pre role="alert" 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-run-error pre role="alert" 追加 不完全`,
    })
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

  // iter783 invariant: cycle-check progressbar fill aria-hidden
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className=\{`h-full \$\{sevBarCls\}`\}\s*\n\s*style=\{\{ width: `\$\{stats\.completionRate\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      ccs,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter783 invariant: cycle-check progressbar fill aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter783 invariant: 破壊` })
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

  console.log(`\n=== Findings (wf-node-error-alert-iter785) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
