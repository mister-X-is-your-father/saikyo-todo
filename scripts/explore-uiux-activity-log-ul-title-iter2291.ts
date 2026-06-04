/**
 * Phase 6.15 loop iter2291: Activity 履歴 ul に title 付与し aria-label と sync
 * (一覧 ul family 5 entity iter2267 と同 pattern、6 entity 一覧 ul family 完成、
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

  const al = readFileSync(resolve(here, '../src/components/workspace/activity-log.tsx'), 'utf8')
  if (!al.includes('iter2291') || !al.includes('title={`Activity 履歴 — ${data.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'Activity 履歴 ul title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const histText = (al.match(/`Activity 履歴 — \$\{data\.length\} 件`/g) || []).length
  if (histText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `Activity 履歴 ul 出現 ${histText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const isp = readFileSync(
    resolve(here, '../src/components/workspace/item-summary-panel.tsx'),
    'utf8',
  )
  if (!isp.includes('iter2289')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2289 案件サマリ region root title が消えている',
    })
  }

  const tp = readFileSync(resolve(here, '../src/components/template/templates-panel.tsx'), 'utf8')
  if (!tp.includes('iter2261')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2261 Template 一覧 ul title が消えている',
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
      '(なし) — Activity 履歴 ul title sync 完了、6 entity 一覧 ul family (sources / workflows / goals / templates / workspaces / activity-log) 完成 (MCP path A 経由発見)',
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
