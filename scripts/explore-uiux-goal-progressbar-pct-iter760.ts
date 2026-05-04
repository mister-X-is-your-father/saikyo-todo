/**
 * Phase 6.15 loop iter 760 (mode-D Desktop a11y) —
 * goals-panel Goal 全体進捗 progressbar の aria-label に進捗 % を含めて拡張。
 * iter757 KR progressbar / iter758 PDCA Cycle / iter759 Sprint Retro と同 pattern。
 *
 * 課題: goals-panel.tsx 行 437 の progressbar aria-label は health label のみ含み、
 *   進捗 % が aria-label に直書きされていない。aria-valuetext は含むが、aria-label が
 *   focus 時に最初に読まれる属性なので % を含めるべき (iter757-759 と同 pattern)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Goal「${title}」全体進捗 ${pct}%${health ? ` (${label})` : ''}` に拡張
 *
 * 検証: source-side regex assert + iter735-759 invariant cross-check。
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
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」全体進捗 \$\{goalPct\}%\$\{health \? ` \(\$\{health\.label\}\)` : ''\}`\}/.test(
      gp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `goal-panel Goal progressbar aria-label に pct% 追加 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `goal-panel Goal progressbar aria-label に pct% 追加 不完全`,
    })
  }

  // iter759 race invariant: workspace-mode-selector Card region
  const wms = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    /role="region"\s*\n\s*aria-label=\{`作業モード設定 \(現在: \$\{MODE_OPTIONS\.find\(\(o\) => o\.value === current\)\?\.label \?\? current\}\)`\}/.test(
      wms,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter759-race invariant: workspace-mode-selector Card region 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter759-race invariant: 破壊` })
  }

  // iter756 invariant: decompose-proposals empty state
  const dpp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    /data-testid="proposals-empty-msg"\s*\n\s*role="status"\s*\n\s*aria-live="polite"/.test(dpp)
  ) {
    findings.push({
      level: 'info',
      message: `iter756 invariant: decompose-proposals empty state 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter756 invariant: 破壊` })
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

  console.log(`\n=== Findings (goal-progressbar-pct-iter760) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
