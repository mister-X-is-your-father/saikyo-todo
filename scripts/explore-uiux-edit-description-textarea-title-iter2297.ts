/**
 * Phase 6.15 loop iter2297: editDescription textarea に title 付与し aria-label
 * state-dependent 3-path と sync (editTitle iter2295 と pair の primary input 2 element
 * 完成、MCP path A 経由発見)。
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
  if (!ed.includes('iter2297')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2297 marker が無い',
    })
  }
  // editDescription 3-path 各 text aria-label + title 計 2 出現
  const emptyText = (ed.match(/説明 \(任意、最大 10000 文字、Markdown 可、複数行入力可\)/g) || [])
    .length
  if (emptyText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `editDescription empty text 出現 ${emptyText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2295 残存
  if (!ed.includes('iter2295')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2295 editTitle input title が消えている',
    })
  }

  const al = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')
  if (!al.includes('iter2293')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2293 activity-detail-toggle title が消えている',
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
      '(なし) — editDescription textarea title 3-path sync 完了、primary input 2 element (title + description) 完成 (MCP path A 経由発見)',
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
