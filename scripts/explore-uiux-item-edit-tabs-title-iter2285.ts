/**
 * Phase 6.15 loop iter2285: ItemEditDialog TabsList (Item 編集タブ landmark) に title 付与し
 * aria-label と sync (Kanban root iter2281 / Gantt root iter2247 と同 landmark root container
 * title pattern を ItemEditDialog TabsList にも展開、MCP path A 経由発見)。
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

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2285') || !ed.includes('title="Item 編集タブ"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'ItemEditDialog TabsList title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const tabsText = (ed.match(/"Item 編集タブ"/g) || []).length
  if (tabsText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Item 編集タブ 出現 ${tabsText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2273 残存
  if (!ed.includes('iter2273')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2273 edit-item-must title が消えている',
    })
  }

  const kv = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (!kv.includes('iter2283') || !kv.includes('iter2281')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2281/2283 kanban-view title が消えている',
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
      '(なし) — ItemEditDialog TabsList title sync 完了、landmark root container title pattern (Kanban / Gantt / TabsList) 4 element 完成 (MCP path A 経由発見)',
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
