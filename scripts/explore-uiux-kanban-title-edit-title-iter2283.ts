/**
 * Phase 6.15 loop iter2283: kanban-title button に title 付与し aria-label と sync
 * (backlog-edit iter2279 と同 pattern、3 view edit entry button title 完成、
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
  if (!kv.includes('iter2283') || !kv.includes('title={`${item.title} — 編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'kanban-title button title が aria-label と sync されていない',
    })
  }
  // iter2281 残存
  if (!kv.includes('iter2281')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2281 Kanban board root title が消えている',
    })
  }
  // aria-label + title 計 2 出現
  const titleText = (kv.match(/`\$\{item\.title\} — 編集`/g) || []).length
  if (titleText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `kanban-title edit text 出現 ${titleText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const bv = readFileSync(resolve(here, '../src/components/workspace/backlog-view.tsx'), 'utf8')
  if (!bv.includes('iter2279')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2279 backlog-edit button title が消えている',
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
      '(なし) — kanban-title button title sync 完了、3 view edit entry (today-title / backlog-edit / kanban-title) title 完成 (MCP path A 経由発見)',
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
