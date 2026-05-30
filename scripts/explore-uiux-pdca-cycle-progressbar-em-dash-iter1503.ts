/**
 * Phase 6.15 loop iter1503: PDCA cycle-check-stats-card progressbar aria-label /
 * aria-valuetext を em-dash 統一 (regression guard、iter758 paren format からの migration)。
 *
 * iter758 で PDCA cycle progressbar に動的 aria-label / aria-valuetext を追加した時の
 * paren convention `(${severityLabel})` がそのまま残存。iter1494 goals-panel /
 * iter1501 副 sprint-card / iter1502 sprint-retro の em-dash 統一からこぼれていた。
 *
 * 修正 (cycle-check-stats-card.tsx):
 *   aria-label:     `PDCA Cycle 完了率 ${pct}% (${sev})` → `... ${pct}% — ${sev}`
 *   aria-valuetext: `${pct}% (${sev})`                  → `${pct}% — ${sev}`
 *
 * 連動更新 (scripts/explore-uiux-sprint-progressbar-pct-iter761.ts):
 *   iter758 invariant regex を em-dash に migration
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-pdca-cycle-progressbar-em-dash-iter1503.ts
 * 前提: なし (source 直読 invariant)
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx')
  const src = readFileSync(filePath, 'utf8')

  if (
    !src.includes(
      'aria-label={`PDCA Cycle 完了率 ${stats.completionRate}% — ${severityLabelJa(sev)}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'PDCA cycle progressbar aria-label が em-dash 形式でない',
    })
  }
  if (
    src.includes(
      'aria-label={`PDCA Cycle 完了率 ${stats.completionRate}% (${severityLabelJa(sev)})`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'PDCA cycle progressbar 旧 () 区切 aria-label が残存',
    })
  }
  if (!src.includes('aria-valuetext={`${stats.completionRate}% — ${severityLabelJa(sev)}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'PDCA cycle progressbar aria-valuetext が em-dash 形式でない',
    })
  }
  if (src.includes('aria-valuetext={`${stats.completionRate}% (${severityLabelJa(sev)})`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'PDCA cycle progressbar 旧 () 区切 aria-valuetext が残存',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — PDCA cycle progressbar aria-label + aria-valuetext が em-dash convention 統一済',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
