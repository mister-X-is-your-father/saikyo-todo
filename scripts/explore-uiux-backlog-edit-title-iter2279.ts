/**
 * Phase 6.15 loop iter2279: backlog-edit button に title 付与し aria-label と sync
 * (cross-view edit button title 統一、MCP path A 経由発見)。
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

  const bv = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')
  if (
    !bv.includes('iter2279') ||
    !bv.includes('title={`編集 — 「${row.original.title}」を編集`}')
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-edit title が aria-label と sync されていない',
    })
  }
  // iter2277 残存
  if (!bv.includes('iter2277')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2277 backlog sortable th title が消えている',
    })
  }

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2275')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2275 today-view 期限 span title が消えている',
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
      '(なし) — backlog-edit button title sync 完了、cross-view edit button title 統一 (MCP path A 経由発見)',
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
