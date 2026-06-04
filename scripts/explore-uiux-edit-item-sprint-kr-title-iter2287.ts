/**
 * Phase 6.15 loop iter2287: edit-item-sprint / edit-item-kr 2 select に title 付与し
 * aria-label state-dependent 3-path と sync (ItemEditDialog 内 assignment select pair
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
  if (!ed.includes('iter2287')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'item-edit-dialog iter2287 marker が無い',
    })
  }
  // sprint 3-path 各 text が aria-label + title 計 2 出現
  const sprintPending = (ed.match(/Sprint 割当を更新中…/g) || []).length
  if (sprintPending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-sprint pending text 出現 ${sprintPending} 回、aria-label + title 計 2 回必要`,
    })
  }
  const sprintEmpty = (ed.match(/未割当 — Sprint 未割当/g) || []).length
  if (sprintEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-sprint empty text 出現 ${sprintEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }
  // kr 3-path
  const krPending = (ed.match(/Key Result 割当を更新中…/g) || []).length
  if (krPending < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-kr pending text 出現 ${krPending} 回、aria-label + title 計 2 回必要`,
    })
  }
  const krEmpty = (ed.match(/未割当 — Key Result 未割当/g) || []).length
  if (krEmpty < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `edit-item-kr empty text 出現 ${krEmpty} 回、aria-label + title 計 2 回必要`,
    })
  }

  // iter2285 残存
  if (!ed.includes('iter2285')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2285 ItemEditDialog TabsList title が消えている',
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
      '(なし) — edit-item-sprint / edit-item-kr 2 select title 3-path sync 完了 (MCP path A 経由発見)',
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
