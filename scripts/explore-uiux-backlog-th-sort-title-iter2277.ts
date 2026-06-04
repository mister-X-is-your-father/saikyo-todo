/**
 * Phase 6.15 loop iter2277: backlog sortable th 5 element に title 付与し aria-label と
 * sync (Status / タイトル / MUST / 期限 / 更新 全 sortable column の sort feedback の
 * cross-modal 統一、MCP path A 経由発見)。
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
  if (!bv.includes('iter2277')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog-view iter2277 marker が無い',
    })
  }
  // aria-label + title 計 2 出現 (sort 列文字列)
  const sortText = (
    bv.match(
      /`\$\{headerName\} 列でソート \(現在: \$\{sortLabel\}\) — Enter \/ Space で次の状態に切替`/g,
    ) || []
  ).length
  if (sortText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `backlog sortable th text 出現 ${sortText} 回、aria-label + title 計 2 回必要`,
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

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2273')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2273 edit-item-must title が消えている',
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
      '(なし) — backlog sortable th 5 element title sync 完了、sort feedback cross-modal 統一 (MCP path A 経由発見)',
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
