/**
 * Phase 6.15 loop iter2289: 案件サマリ region root container に title 付与し aria-label
 * と sync (3 chip iter2237 と pair の region root container 補完、MCP path A 経由発見)。
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

  const isp = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (!isp.includes('iter2289') || !isp.includes('title={`案件サマリ${')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: '案件サマリ region root title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const sumText = (isp.match(/`案件サマリ\$\{/g) || []).length
  if (sumText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `案件サマリ region root 出現 ${sumText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2237 残存
  if (!isp.includes('iter2237')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2237 item-summary 3 chip title が消えている',
    })
  }

  const ed = readFileSync(resolve(here, '../src/components/workspace/item-edit-dialog.tsx'), 'utf8')
  if (!ed.includes('iter2287') || !ed.includes('iter2285')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2285/2287 item-edit-dialog title 系列が消えている',
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
      '(なし) — 案件サマリ region root title sync 完了、3 chip iter2237 と pair で region + chip 全 4 element 完成 (MCP path A 経由発見)',
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
