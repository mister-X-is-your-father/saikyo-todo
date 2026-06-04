/**
 * Phase 6.15 loop iter1967: personal-period-view goal textarea に title 付与
 * (teDate iter1955 / teCategory iter1957 / picker-search iter1961 と同 state-dependent input pattern)。
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

  const period = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!period.includes('iter1967') || !period.includes('ゴール (任意、最大 2000 文字')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'period-goal-textarea title が無い',
    })
  }

  const ws = readFileSync(resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'), 'utf8')
  if (
    !ws.includes(
      'title="Workspace dashboard — Today / Inbox / Kanban / Backlog / Gantt / Dashboard"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1965 workspace main title が消えている',
    })
  }
  if (
    !ws.includes(
      'title="ワークスペース内 — Goals / Sprints / PDCA / Templates / Workflows / API / Time / Archive"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1963 workspace nav title が消えている',
    })
  }

  const sip = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!sip.includes('iter1961')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1961 picker-search title が消えている',
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
    console.log('(なし) — period-goal textarea title 付与、iter1965-1777 invariant 不変')
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
