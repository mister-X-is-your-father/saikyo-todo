/**
 * Phase 6.15 loop iter2183: BulkCheckbox に title 付与し aria-label と sync
 * (taskchute-timeline iter2181 / taskchute-ticker iter2179 と同 title=aria-label sync pattern)。
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

  const ba = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')
  if (!ba.includes('iter2183') || !ba.includes('title={label}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkCheckbox title が aria-label と sync されていない',
    })
  }
  // iter1999 invariant (bulk region title)
  if (!ba.includes('iter1999')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1999 bulk region title が消えている',
    })
  }

  const tc = readFileSync(resolve(here, '../src/components/workspace/taskchute-view.tsx'), 'utf8')
  if (!tc.includes('iter2181')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2181 taskchute ol timeline title 同期 が消えている',
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
    console.log('(なし) — BulkCheckbox title 同期、iter2181-1843 invariant 不変')
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
