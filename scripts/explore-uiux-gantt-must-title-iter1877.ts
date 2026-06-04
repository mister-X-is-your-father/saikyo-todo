/**
 * Phase 6.15 loop iter1877: gantt-view inline MUST chip に title 付与
 * (MustBadge iter1843 と同 vocab で gantt 行内 MUST も hover disclose)。
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

  const gantt = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  // gantt 行内 MUST chip の title 検出 — aria-label="MUST タスク" + title="MUST タスク" の隣接 pair
  if (!gantt.match(/aria-label="MUST タスク"[\s\S]{0,200}title="MUST タスク"/)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view inline MUST chip title が無い',
    })
  }

  const today = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!today.includes('title={`${it.dueTime.slice(0, 5)} — 期限時刻`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1875 today dueTime title が消えている',
    })
  }

  const backlog = readFileSync(
    resolve(here, '../src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (!backlog.includes('title="ドラッグで並び替え"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1873 backlog DragHandle title が消えている',
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
    console.log('(なし) — gantt inline MUST title 付与、iter1875-1777 invariant 不変')
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
