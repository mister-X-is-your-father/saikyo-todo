/**
 * Phase 6.15 loop iter2185: BulkHeaderCheckbox に title 付与し aria-label と sync
 * (BulkCheckbox iter2183 と pair の bulk family title 同期)。
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
  if (
    !ba.includes('iter2185') ||
    !ba.includes('`全解除 — 現ページ ${rowIds.length} 行をすべて選択中、クリックで全解除`')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'BulkHeaderCheckbox title が aria-label と sync されていない',
    })
  }
  // iter2183 invariant
  if (!ba.includes('iter2183')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2183 BulkCheckbox title 同期 が消えている',
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
    console.log('(なし) — BulkHeaderCheckbox title 同期、iter2183-1843 invariant 不変')
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
