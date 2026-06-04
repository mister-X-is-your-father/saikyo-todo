/**
 * Phase 6.15 loop iter2245: weekly-time-trend-chip に title 付与し aria-label と sync
 * (daily-streak-chip と pair の time-entry chip 2 element 完成)。
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

  const tib = readFileSync(
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (!tib.includes('iter2245') || !tib.includes('title={summary.trendLine}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'weekly-time-trend-chip title が aria-label と sync されていない',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (!sp.includes('iter2243')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2243 subtasks-panel ol title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2241')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2241 goals-panel KR add form title が消えている',
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
    console.log(
      '(なし) — weekly-time-trend-chip title sync 完了、time-entry chip 2 element pair 完成',
    )
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
