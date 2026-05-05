/**
 * Phase 6.15 loop iter 824 (mode-D Desktop a11y) —
 * active-timer-panel 見積 + 校正後 chip 内 visible text を aria-hidden span で wrap。
 *
 * 課題: active-timer-panel.tsx 行 180-200 の 見積 chip ("見積 30分") + 校正後 chip
 *   ("→ 39分") は parent <span> に aria-label が完全 content を含むのに、内側
 *   visible text は aria-hidden 無しで重複読み上げ。iter800-823 sweep の続編。
 *
 * fix (1 ファイル ~4 行差分):
 *   - 見積 chip 内 visible "見積 N分" を <span aria-hidden="true"> で wrap
 *   - 校正後 chip 内 visible "→ N分" を <span aria-hidden="true"> で wrap
 *
 * 検証: source-side regex assert + iter735-823 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const atp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  const hasEstimateAriaHidden = /<span aria-hidden="true">見積 \{estimateMinutes\}分<\/span>/.test(
    atp,
  )
  const hasCalibratedAriaHidden =
    /<span aria-hidden="true">→ \{calibrated\.calibratedMinutes\}分<\/span>/.test(atp)
  if (hasEstimateAriaHidden && hasCalibratedAriaHidden) {
    findings.push({
      level: 'info',
      message: `active-timer-panel 見積 + 校正後 chip aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `active-timer-panel chip aria-hidden 不完全 (estimate=${hasEstimateAriaHidden} calibrated=${hasCalibratedAriaHidden})`,
    })
  }

  // iter823 invariant: sprint-retro 完了率 visible % aria-hidden
  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (/<span className="text-2xl font-semibold tabular-nums" aria-hidden="true">/.test(srw)) {
    findings.push({
      level: 'info',
      message: `iter823 invariant: sprint-retro 完了率 % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter823 invariant: 破壊` })
  }

  // iter822 invariant: cycle-check 完了率 visible % aria-hidden
  const cc = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (/<span className="text-2xl font-semibold tabular-nums" aria-hidden="true">/.test(cc)) {
    findings.push({
      level: 'info',
      message: `iter822 invariant: cycle-check 完了率 % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter822 invariant: 破壊` })
  }

  // iter819 invariant: sprint progress visible % chip aria-hidden
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    /\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{done\} \/ \{total\} \(\{pct\}%\)/.test(sp)
  ) {
    findings.push({
      level: 'info',
      message: `iter819 invariant: sprint progress visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter819 invariant: 破壊` })
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

  console.log(`\n=== Findings (active-timer-estimate-aria-hidden-iter824) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
