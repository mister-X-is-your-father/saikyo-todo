/**
 * Phase 6.15 loop iter2223: proposal title button title を aria-label と sync
 * (interrupt-note iter2221 / mock-top-nav iter2219 と同 title=aria-label sync pattern)。
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

  const dp = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (
    !dp.includes('iter2223') ||
    !dp.includes("title={`${proposal.title} — 提案を編集${proposal.isMust ? ' (MUST)' : ''}`}")
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposal title button title が aria-label と sync されていない',
    })
  }

  const sp = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!sp.includes('iter2221')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2221 interrupt-note input title 同期 が消えている',
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
    console.log('(なし) — proposal title button title 同期、iter2221-1843 invariant 不変')
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
