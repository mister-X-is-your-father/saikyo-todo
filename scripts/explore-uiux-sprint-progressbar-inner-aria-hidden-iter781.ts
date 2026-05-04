/**
 * Phase 6.15 loop iter 781 (mode-D Desktop a11y) —
 * sprints-panel sprint progressbar の内部 fill / ideal 線 div に aria-hidden を追加。
 *
 * 課題: sprints-panel.tsx 行 551-562 の progressbar 内部 div (色付き fill / ideal 線
 *   経過率 marker) は aria-hidden が無い。parent progressbar は aria-label / aria-valuetext
 *   で完全な情報を提供するので、内部の visual-only div は aria-hidden で SR 重複読み上げを
 *   抑制すべき (iter98 PDCA bar / iter441 active-timer と同 pattern)。
 *
 * fix (1 ファイル ~2 行差分):
 *   - 内部 fill div と ideal 線 div に `aria-hidden="true"` 追加
 *
 * 検証: source-side regex assert + iter735-780 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

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
      message: `sprint progressbar 内部 fill div aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint progressbar 内部 fill div aria-hidden 追加 不完全`,
    })
  }

  // ideal 線 div
  if (
    /<div\s*\n\s*className="bg-foreground\/40 absolute top-0 h-full w-px"\s*\n\s*style=\{\{ left: `\$\{elapsedPct\}%` \}\}\s*\n\s*aria-hidden="true"/.test(
      sp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `sprint progressbar 内部 ideal 線 div aria-hidden 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint progressbar 内部 ideal 線 div aria-hidden 追加 不完全`,
    })
  }

  // iter780 invariant: home page header aria-label
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

  console.log(`\n=== Findings (sprint-progressbar-inner-aria-hidden-iter781) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
