/**
 * Phase 6.15 loop iter 782 (mode-D Desktop a11y) —
 * goals-panel Goal / KR progressbar の内部 fill div に aria-hidden を追加。
 * iter781 sprint progressbar inner と同 pattern を Goal / KR にも展開。
 *
 * 課題: goals-panel.tsx 行 445-448 (Goal progressbar fill) と 行 732 (KR progressbar fill)
 *   は aria-hidden が無い。parent progressbar が aria-label / aria-valuetext で完全な情報を
 *   提供するので、内部 visual-only div は aria-hidden で SR 重複読み上げ抑制が望ましい。
 *
 * fix (1 ファイル ~3 行差分):
 *   - Goal progressbar fill div に aria-hidden="true"
 *   - KR progressbar fill div に aria-hidden="true"
 *
 * 検証: source-side regex assert + iter735-781 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  // Goal progressbar fill aria-hidden
  if (
    /<div\s*\n\s*className=\{`\$\{TIER_BAR_CLASS\[tier\]\} h-full`\}\s*\n\s*style=\{\{ width: `\$\{goalPct\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `Goal progressbar fill aria-hidden 追加 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `Goal progressbar fill aria-hidden 追加 不完全`,
    })
  }
  // KR progressbar fill aria-hidden
  if (
    /<div\s*\n\s*className="bg-primary h-full"\s*\n\s*style=\{\{ width: `\$\{pct\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `KR progressbar fill aria-hidden 追加 OK` })
  } else {
    findings.push({
      level: 'warning',
      message: `KR progressbar fill aria-hidden 追加 不完全`,
    })
  }

  // iter781 invariant: sprint progressbar 内部 div aria-hidden
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
      message: `iter781 invariant: sprint progressbar 内部 fill div aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter781 invariant: 破壊` })
  }

  // iter780 invariant: home page header
  const hp = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
  if (
    /<header className="flex items-center justify-between" aria-label="最強TODO ホーム header">/.test(
      hp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter780 invariant: home page header aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter780 invariant: 破壊` })
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

  console.log(`\n=== Findings (goal-kr-progressbar-inner-aria-hidden-iter782) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
