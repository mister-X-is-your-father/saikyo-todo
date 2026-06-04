/**
 * Phase 6.15 loop iter2165: PDCA Cycle progressbar に title 付与し aria-label と sync
 * (retro-comparison iter2163 / schedule-picker iter2161 と同 title=aria-label sync pattern、
 *  progressbar family iter1931-1933-1935-2051-2055 続き)。
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

  const cc = readFileSync(
    resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (
    !cc.includes('iter2165') ||
    !cc.includes('title={`PDCA Cycle 完了率 ${stats.completionRate}% — ${severityLabelJa(sev)}`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'PDCA Cycle progressbar title が aria-label と sync されていない',
    })
  }

  const sr = readFileSync(resolve(here, '../src/components/sprint/sprint-retro-widget.tsx'), 'utf8')
  if (!sr.includes('iter2163')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2163 retro-comparison group title 同期 が消えている',
    })
  }

  const mustBadge = readFileSync(
    resolve(here, '../src/components/workspace/must-badge.tsx'),
    'utf8',
  )
  if (!mustBadge.includes('title="MUST タスク"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1843 MustBadge title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — PDCA Cycle progressbar title 付与、iter2163-1843 invariant 不変')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
