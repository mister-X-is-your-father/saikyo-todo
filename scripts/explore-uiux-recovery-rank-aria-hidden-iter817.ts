/**
 * Phase 6.15 loop iter 817 (mode-D Desktop a11y) —
 * recovery-plan-section の visible rank "1." span を aria-hidden 化 (ol が自動で
 * "1 of 3" を読むので redundant)。
 *
 * 課題: recovery-plan-section.tsx 行 83-85 の visible rank span は ol > li の
 *   list semantics で SR が自動的に "1 of 3" を読み上げるのに、visible text
 *   "1." は別途残されたまま aria-hidden 無し。SR ユーザは "1 of 3, 1." と
 *   重複読み上げになる。WCAG redundant text の典型例。
 *
 * fix (1 ファイル ~5 行差分):
 *   - rank span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-816 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const rps = readFileSync(
    resolve(process.cwd(), 'src/components/item/recovery-plan-section.tsx'),
    'utf8',
  )
  const hasRankAriaHidden =
    /text-muted-foreground text-\[10px\] tabular-nums"\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{action\.rank\}\./.test(
      rps,
    )
  if (hasRankAriaHidden) {
    findings.push({
      level: 'info',
      message: `recovery-plan rank span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `recovery-plan rank span aria-hidden 不完全`,
    })
  }

  // iter816 invariant: backlog estimate summary aria-hidden
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{estimateSummary\}<\/span>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter816 invariant: backlog estimate summary aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter816 invariant: 破壊` })
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

  console.log(`\n=== Findings (recovery-rank-aria-hidden-iter817) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
