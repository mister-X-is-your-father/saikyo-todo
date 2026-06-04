/**
 * Phase 6.15 loop iter1883: subtasks-panel child-count chip に title 付与
 * (team-capacity-name / swimlane-population title sweep の続編)。
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

  const subtasks = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasks.includes('title={`このタスクには子タスクが ${grandchildren.length} 件あります`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtasks-panel child-count chip title が無い',
    })
  }

  const teamCap = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (!teamCap.includes('title={`${name} — member`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1881 team-capacity name title が消えている',
    })
  }

  const swimlane = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (!swimlane.includes('title={`${populationLabel} — Sprint 全体`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1879 swimlane population title が消えている',
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
    console.log('(なし) — subtasks child-count title 付与、iter1881-1777 invariant 不変')
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
