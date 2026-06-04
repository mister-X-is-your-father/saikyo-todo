/**
 * Phase 6.15 loop iter2281: Kanban board root group に title 付与し aria-label と sync
 * (Gantt root iter2247 と同 chart/board root container title pattern を Kanban にも展開、
 * MCP path A 経由発見)。
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

  const kv = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (!kv.includes('iter2281') || !kv.includes('title={`Kanban ボード — ${statuses.length} 列`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-board root title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const boardText = (kv.match(/`Kanban ボード — \$\{statuses\.length\} 列`/g) || []).length
  if (boardText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Kanban ボード text 出現 ${boardText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const bv = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')
  if (!bv.includes('iter2279') || !bv.includes('iter2277')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2277/2279 backlog title 系列が消えている',
    })
  }

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2247')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2247 gantt-view root title が消えている',
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
      '(なし) — Kanban board root group title sync 完了、3 view root container title 完成 (Gantt / Kanban / Backlog) (MCP path A 経由発見)',
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
