/**
 * Phase 6.15 loop iter 760 (mode-D Desktop a11y) —
 * goals-panel Goal 全体進捗 progressbar の aria-label に進捗 % を含めて拡張
 * (iter757 KR / iter758 PDCA Cycle / iter759 Sprint Retro と同 pattern を Goal 全体進捗 bar に展開)。
 *
 * 課題: goals-panel.tsx 行 437 の `aria-label={`Goal「${goal.title}」全体進捗${
 *   health ? ` (${health.label})` : ''}`}` は health label のみで進捗 % が見えない。
 *   aria-valuenow / aria-valuetext は持っているが、aria-label は landmark / progressbar
 *   focus 時に最初に読まれる属性。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Goal「${goal.title}」全体進捗 ${goalPct}%${health ? ` (${health.label})` : ''}` に動的化
 *
 * 検証: source-side regex assert + iter727-759 invariant cross-check。
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

  // 1. Goal 全体進捗 progressbar 動的 aria-label
  const hasDynamicLabel =
    /aria-label=\{`Goal「\$\{goal\.title\}」全体進捗 \$\{goalPct\}%\$\{health \? ` \(\$\{health\.label\}\)` : ''\}`\}/.test(
      gp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Goal 全体進捗 progressbar 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Goal 全体進捗 progressbar 動的 aria-label 欠落` })
  }

  // 2. iter759 invariant: sprint-retro progressbar 維持
  const sr = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`Sprint Retro 完了率 \$\{summary\.completionRate\}% \(\$\{completionRateSeverityLabelJa\(sev\)\}\)`\}/.test(
      sr,
    )
  ) {
    findings.push({ level: 'info', message: `iter759 invariant: sprint-retro progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter759 invariant: 破壊` })
  }

  // 3. iter758 invariant: cycle 完了率 progressbar 維持
  const ccs = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    /aria-label=\{`PDCA Cycle 完了率 \$\{stats\.completionRate\}% \(\$\{severityLabelJa\(sev\)\}\)`\}/.test(
      ccs,
    )
  ) {
    findings.push({ level: 'info', message: `iter758 invariant: cycle 完了率 progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter758 invariant: 破壊` })
  }

  // 4. iter757 invariant: KR progressbar 維持 (同 file 別箇所)
  if (/aria-label=\{`KR「\$\{kr\.title\}」進捗 \$\{pct\}%`\}/.test(gp)) {
    findings.push({ level: 'info', message: `iter757 invariant: KR progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter757 invariant: 破壊` })
  }

  // 5. iter744 invariant: Goal status group 維持 (同 file 別箇所)
  if (
    /aria-label=\{`Goal「\$\{goal\.title\}」のステータス操作 \(現在: \$\{goalStatusLabelJa\(status\)\}、完了 \/ アーカイブ \/ 再開\)`\}/.test(
      gp,
    )
  ) {
    findings.push({ level: 'info', message: `iter744 invariant: Goal status group 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter744 invariant: 破壊` })
  }

  console.log(`\n=== Findings (goal-overall-progressbar-iter760) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
