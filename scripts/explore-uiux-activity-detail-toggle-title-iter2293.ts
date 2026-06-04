/**
 * Phase 6.15 loop iter2293: activity-detail-toggle に title 付与し aria-label と sync
 * (state-dependent 2-path、template-card iter2239 と同 disclosure button title pattern、
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
  if (!al.includes('iter2293')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log iter2293 marker が無い',
    })
  }
  // 2-path text 計 2 出現
  const openText = (al.match(/詳細を閉じる — 「\$\{label\}」の差分/g) || []).length
  if (openText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `activity-detail-toggle open text 出現 ${openText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const closedText = (al.match(/詳細を見る — 「\$\{label\}」の差分/g) || []).length
  if (closedText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `activity-detail-toggle closed text 出現 ${closedText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2291 残存
  if (!al.includes('iter2291')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2291 Activity 履歴 ul title が消えている',
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
    console.log('(なし) — activity-detail-toggle title 2-path sync 完了 (MCP path A 経由発見)')
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
