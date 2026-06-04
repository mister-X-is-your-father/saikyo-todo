/**
 * Phase 6.15 loop iter2173: pdca daily-bars list に title 付与し aria-label と sync
 * (pdca-counts-group iter2171 / weekly-anomalies iter2169 と同 title=aria-label sync pattern)。
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

  const pp = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (
    !pp.includes('iter2173') ||
    !pp.includes('title={`日次完了 throughput — ${data.length} 日分`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca daily-bars list title が aria-label と sync されていない',
    })
  }
  if (!pp.includes('iter2171')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2171 PDCA 4 段階の集計 group title 同期 が消えている',
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
    console.log('(なし) — pdca daily-bars list title 付与、iter2171-1843 invariant 不変')
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
