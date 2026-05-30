/**
 * Phase 6.15 loop iter 761 (mode-D Desktop a11y) —
 * sprints-panel Sprint progressbar の aria-label に進捗 % + 件数を含めて拡張
 * (iter757-760 progressbar aria-label sweep の最終 cleanup)。
 *
 * 課題: sprints-panel.tsx 行 543 の `aria-label={`Sprint「${sprint.name}」完了率
 *   (${sprintProgressToneLabel(tone)})`}` は tone label のみで進捗 % / 件数が見えない。
 *   aria-valuenow / aria-valuetext は持っているが、aria-label は landmark / progressbar
 *   focus 時に最初に読まれる属性。iter757-760 で他 progressbar は % 込みに揃えたので
 *   Sprint も同様に揃える。
 *
 * fix (1 ファイル ~1 行差分):
 *   - aria-label を `Sprint「${sprint.name}」完了率 ${pct}% (${done}/${total} 件、
 *     ${sprintProgressToneLabel(tone)})` に動的化
 *
 * 検証: source-side regex assert + iter727-760 invariant cross-check。
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

  // 1. Sprint progressbar 動的 aria-label
  //    iter1501: () 区切 → em-dash 区切 (iter1093-1500 sweep に追従、検証目的 = 動的
  //    pct/done/total/tone content 維持の guard で punctuation は本質的 invariant ではない)
  const hasDynamicLabel =
    /aria-label=\{`Sprint「\$\{sprint\.name\}」完了率 \$\{pct\}% — \$\{done\}\/\$\{total\} 件、\$\{sprintProgressToneLabel\(tone\)\}`\}/.test(
      sp,
    )

  if (hasDynamicLabel) {
    findings.push({ level: 'info', message: `Sprint progressbar 動的 aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `Sprint progressbar 動的 aria-label 欠落` })
  }

  // 2. iter760 invariant: Goal 全体進捗 progressbar 維持
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
      message: `iter760 invariant: Goal 全体進捗 progressbar 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter760 invariant: 破壊` })
  }

  // 3. iter759 invariant: sprint-retro progressbar 維持
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

  // 4. iter758 invariant: cycle 完了率 progressbar 維持
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

  // 5. iter757 invariant: KR progressbar 維持
  if (/aria-label=\{`KR「\$\{kr\.title\}」進捗 \$\{pct\}%`\}/.test(gp)) {
    findings.push({ level: 'info', message: `iter757 invariant: KR progressbar 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter757 invariant: 破壊` })
  }

  console.log(`\n=== Findings (sprint-progressbar-pct-iter761) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
