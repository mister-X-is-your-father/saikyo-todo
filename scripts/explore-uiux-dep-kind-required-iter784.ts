/**
 * Phase 6.15 loop iter 784 (mode-D Desktop a11y) —
 * item-dependencies-panel dep-kind select に required + aria-required を追加。
 * iter770-778 form required attribute sweep の補完最終。
 *
 * 課題: item-dependencies-panel.tsx 行 184-199 の dep-kind select は実質 required
 *   (prerequisite / related の 2 択必須) だが HTML required / aria-required 属性が無い。
 *
 * fix (1 ファイル ~2 行差分):
 *   - select に `required` + `aria-required="true"` 追加
 *
 * 検証: source-side regex assert + iter735-783 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

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
      message: `item-dependencies-panel dep-kind select required + aria-required 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dep-kind required 追加 不完全`,
    })
  }

  // iter783 invariant: cycle-check / sprint-retro progressbar fill aria-hidden
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

  // iter782 invariant: Goal/KR progressbar fill aria-hidden
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className=\{`\$\{TIER_BAR_CLASS\[tier\]\} h-full`\}\s*\n\s*style=\{\{ width: `\$\{goalPct\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter782 invariant: Goal progressbar fill aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter782 invariant: 破壊` })
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

  console.log(`\n=== Findings (dep-kind-required-iter784) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
