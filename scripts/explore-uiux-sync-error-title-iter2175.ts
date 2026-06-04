/**
 * Phase 6.15 loop iter2175: time-entries sync-error div title を aria-label と sync
 * (pdca-daily-bars iter2173 / pdca-counts-group iter2171 と同 title=aria-label sync pattern)。
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

  const tt = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (!tt.includes('iter2175') || !tt.includes('title={`${e.syncError} — 同期エラー`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sync-error div title が aria-label と sync されていない',
    })
  }

  const pp = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pp.includes('iter2173')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2173 pdca daily-bars list title 同期 が消えている',
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
    console.log('(なし) — sync-error div title 同期、iter2173-1843 invariant 不変')
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
