/**
 * Phase 6.15 loop iter2147: filter-count status に title 付与し aria-label と sync
 * (dashboard-must-edit iter2145 / wf-trigger-presets iter2143 と同 title=aria-label
 *  sync pattern)。
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

  const ib = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!ib.includes('iter2147') || !ib.includes('title={label}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'filter-count title が aria-label と sync されていない',
    })
  }

  const dv = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')
  if (!dv.includes('iter2145')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2145 dashboard MUST item button title 同期 が消えている',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
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
    console.log('(なし) — filter-count title 同期、iter2145-1843 invariant 不変')
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
