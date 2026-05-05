/**
 * Phase 6.15 loop iter 823 (mode-D Desktop a11y) —
 * sprint-retro-widget 完了率 visible "{summary.completionRate}%" span を aria-hidden 化
 * (iter819-822 同 pattern を Sprint Retro にも展開、5 progressbar inner 完成)。
 *
 * 課題: sprint-retro-widget.tsx 行 86-89 の 完了率 visible % span は sibling
 *   progressbar (行 91-) の aria-label / aria-valuetext に同じ情報が含まれているのに
 *   aria-hidden 無し。iter819-822 の sprint/Goal/KR/Cycle 同 pattern を Sprint Retro
 *   にも展開。これで progressbar sibling visible % aria-hidden 5/5 完成 (sprint /
 *   Goal / KR / Cycle / Sprint Retro)。
 *
 * fix (1 ファイル ~1 行差分):
 *   - 完了率 visible span に aria-hidden="true" 追加
 *
 * 検証: source-side regex assert + iter735-822 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const srw = readFileSync(
    resolve(process.cwd(), 'src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  const hasPctAriaHidden =
    /<span className="text-2xl font-semibold tabular-nums" aria-hidden="true">/.test(srw)
  if (hasPctAriaHidden) {
    findings.push({
      level: 'info',
      message: `sprint-retro 完了率 visible % span aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `sprint-retro 完了率 visible % aria-hidden 不完全`,
    })
  }

  // iter822 invariant: cycle-check 完了率 visible %
  const cc = readFileSync(
    resolve(process.cwd(), 'src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (/<span className="text-2xl font-semibold tabular-nums" aria-hidden="true">/.test(cc)) {
    findings.push({
      level: 'info',
      message: `iter822 invariant: cycle-check 完了率 visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter822 invariant: 破壊` })
  }

  // iter821 invariant: Goal 全体進捗 visible %
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/\}`\}\s*\n?\s*aria-hidden="true"\s*\n?\s*>\s*\n?\s*\{goalPct\}%/.test(gp)) {
    findings.push({
      level: 'info',
      message: `iter821 invariant: Goal 全体進捗 visible % aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter821 invariant: 破壊` })
  }

  // iter819 invariant: sprint progress visible %
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

  console.log(`\n=== Findings (sprint-retro-pct-aria-hidden-iter823) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
