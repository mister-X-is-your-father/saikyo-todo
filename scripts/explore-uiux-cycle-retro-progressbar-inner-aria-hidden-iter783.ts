/**
 * Phase 6.15 loop iter 783 (mode-D Desktop a11y) —
 * cycle-check-stats-card / sprint-retro-widget の progressbar 内部 fill div に
 * aria-hidden を追加。iter781/782 progressbar inner sweep の最終。
 *
 * 課題: cycle-check-stats-card.tsx 行 88 + sprint-retro-widget.tsx 行 100-111 の
 *   progressbar fill div は aria-hidden が無い。parent progressbar が aria-label /
 *   aria-valuetext で完全な情報を提供するので、内部 visual-only div は aria-hidden で
 *   SR 重複読み上げ抑制が望ましい。
 *
 * fix (2 ファイル ~5 行差分):
 *   - cycle-check fill div + sprint-retro fill div に aria-hidden="true"
 *
 * 検証: source-side regex assert + iter735-782 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

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
      message: `cycle-check progressbar fill div aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `cycle-check progressbar fill div aria-hidden 追加 不完全`,
    })
  }

  const sr = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /style=\{\{ width: `\$\{summary\.completionRate\}%` \}\}\s*\n\s*aria-hidden="true"/.test(sr)
  ) {
    findings.push({
      level: 'info',
      message: `sprint-retro progressbar fill div aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro progressbar fill div aria-hidden 追加 不完全`,
    })
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

  // iter781 invariant: sprint progressbar 内部
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /<div\s*\n\s*className=\{`\$\{PROGRESS_TONE_BAR_CLASS\[tone\]\} h-full`\}\s*\n\s*style=\{\{ width: `\$\{pct\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter781 invariant: sprint progressbar 内部 fill aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter781 invariant: 破壊` })
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

  console.log(`\n=== Findings (cycle-retro-progressbar-inner-aria-hidden-iter783) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
