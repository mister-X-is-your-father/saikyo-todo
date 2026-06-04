/**
 * Phase 6.15 loop iter2227: workspace-header に title 付与し aria-label と sync
 * (op-board-itemrow iter2225 / proposal-title-btn iter2223 と同 title=aria-label sync pattern)。
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

  const wh = readFileSync(resolve(here, '../src/components/workspace/workspace-header.tsx'), 'utf8')
  if (!wh.includes('iter2227') || !wh.includes('title={`${title} — Workspace`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-header title が aria-label と sync されていない',
    })
  }

  const op = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!op.includes('iter2225')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2225 op-board ItemRow title 同期 が消えている',
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
    console.log('(なし) — workspace-header title 同期、iter2225-1843 invariant 不変')
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
