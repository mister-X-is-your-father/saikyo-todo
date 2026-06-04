/**
 * Phase 6.15 loop iter2177: dep-readiness-chip に title 付与し aria-label と sync
 * (sync-error iter2175 / pdca-daily-bars iter2173 と同 title=aria-label sync pattern)。
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

  const dep = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (
    !dep.includes('iter2177') ||
    !dep.includes('title={`${readinessSummary} — 依存サマリ (${readinessVisual.toneLabel})`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'dep-readiness-chip title が aria-label と sync されていない',
    })
  }
  // iter2111 dep-remove invariant
  if (!dep.includes('iter2111')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2111 dep-remove title 同期 が消えている',
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
    console.log('(なし) — dep-readiness-chip title 付与、iter2175-1843 invariant 不変')
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
