/**
 * Phase 6.15 loop iter1873: backlog-view DragHandle に title 付与
 * (palette/taskchute/period/inbox/kanban/backlog-estimate title sweep の続編)。
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

  const backlog = readFileSync(
    resolve(here, '../src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  if (!backlog.includes('title="ドラッグで並び替え"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'backlog DragHandle title が無い',
    })
  }

  if (!backlog.includes('title={`${estimateSummary} — Backlog 見積サマリ`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1871 backlog estimate-summary title が消えている',
    })
  }

  const kanban = readFileSync(resolve(here, '../src/components/workspace/kanban-view.tsx'), 'utf8')
  if (!kanban.includes('title={`子タスク ${childCount} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1869 kanban child-count title が消えている',
    })
  }

  const palette = readFileSync(
    resolve(here, '../src/components/shared/command-palette.tsx'),
    'utf8',
  )
  if (!palette.includes('title={`p${item.priority ?? 4}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1867 palette priority title が消えている',
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

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — backlog DragHandle title 付与、iter1871-1777 invariant 不変')
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
