/**
 * Phase 6.15 loop iter2197: StatCard role="group" に title 付与し aria-label と sync
 * (Goal 一覧 iter2195 / Sprint 一覧 iter2193 と同 title=aria-label sync pattern)。
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

  const dv = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')
  if (!dv.includes('iter2197') || !dv.includes('title={ariaLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'StatCard title が ariaLabel と sync されていない',
    })
  }
  // iter1953 invariant (dashboard MUST region title)
  if (!dv.includes('iter1953')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1953 dashboard MUST 一覧 region title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2195')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2195 Goal 一覧 ul title 同期 が消えている',
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
    console.log('(なし) — StatCard title 同期、iter2195-1843 invariant 不変')
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
