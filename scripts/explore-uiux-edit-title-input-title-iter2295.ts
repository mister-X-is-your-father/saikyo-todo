/**
 * Phase 6.15 loop iter2295: editTitle input に title 付与し aria-label state-dependent
 * 4-path と sync (ItemEditDialog primary input title 補完、MCP path A 経由発見)。
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
  if (!ed.includes('iter2295')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2295 marker が無い',
    })
  }
  // editTitle 4-path 各 text aria-label + title 計 2 出現
  const requiredText = (ed.match(/タイトル \(必須、最大 500 文字\)/g) || []).length
  if (requiredText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `editTitle required text 出現 ${requiredText} 回、aria-label + title 計 2 回必要`,
    })
  }
  const limitNear = (ed.match(/タイトル \(現在 \$\{title\.length\} \/ 500 文字、上限近接\)/g) || [])
    .length
  if (limitNear < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `editTitle 上限近接 text 出現 ${limitNear} 回、aria-label + title 計 2 回必要`,
    })
  }
  // iter2287 残存
  if (!ed.includes('iter2287')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2287 edit-item-sprint/kr title が消えている',
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
      '(なし) — editTitle input title 4-path sync 完了、ItemEditDialog primary input title 補完 (MCP path A 経由発見)',
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
