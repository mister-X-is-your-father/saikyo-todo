/**
 * Phase 6.15 loop iter2215: workspace-mode radiogroup に title 付与し aria-label と sync
 * (item-decompose-btn iter2213 / engineer-trigger-group iter2207 と同 title=aria-label sync pattern)。
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

  const wm = readFileSync(
    resolve(here, '../src/components/workspace/workspace-mode-selector.tsx'),
    'utf8',
  )
  if (
    !wm.includes('iter2215') ||
    !wm.includes(
      'title={`workspace の default 作業モード — 現在 ${MODE_OPTIONS.find((o) => o.value === current)?.label ?? current}`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace-mode radiogroup title が aria-label と sync されていない',
    })
  }

  const idb = readFileSync(
    resolve(here, '../src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (!idb.includes('iter2213')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2213 item-decompose-btn title 同期 が消えている',
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
    console.log('(なし) — workspace-mode radiogroup title 同期、iter2213-1843 invariant 不変')
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
