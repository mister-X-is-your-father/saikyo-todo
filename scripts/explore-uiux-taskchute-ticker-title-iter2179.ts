/**
 * Phase 6.15 loop iter2179: taskchute-ticker-summary に title 付与し aria-label と sync
 * (dep-readiness-chip iter2177 / sync-error iter2175 と同 title=aria-label sync pattern)。
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

  const tc = readFileSync(resolve(here, '../src/components/workspace/taskchute-view.tsx'), 'utf8')
  if (!tc.includes('iter2179') || !tc.includes('title={`合計 ${ticker.totalEstimateMin} 分')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'taskchute-ticker-summary title が aria-label と sync されていない',
    })
  }
  // iter2047 invariant (taskchute region title)
  if (!tc.includes('iter2047')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2047 taskchute region title 同期 が消えている',
    })
  }

  const dep = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!dep.includes('iter2177')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2177 dep-readiness-chip title 同期 が消えている',
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
    console.log('(なし) — taskchute-ticker-summary title 付与、iter2177-1843 invariant 不変')
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
