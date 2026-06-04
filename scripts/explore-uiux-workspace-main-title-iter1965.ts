/**
 * Phase 6.15 loop iter1965: workspace main landmark に title 付与
 * (workspace nav iter1963 と pair、landmark family の hover summary 完備)。
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

  const ws = readFileSync(resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'), 'utf8')
  if (
    !ws.includes(
      'title="Workspace dashboard — Today / Inbox / Kanban / Backlog / Gantt / Dashboard"',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace main landmark title が無い',
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
      message: 'iter1963 workspace nav landmark title が消えている',
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

  const dv = readFileSync(resolve(here, '../src/components/workspace/dashboard-view.tsx'), 'utf8')
  if (!dv.includes('title={`MUST Item 一覧 — ${s.items.length} 件`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1953 dashboard MUST region title が消えている',
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
    console.log('(なし) — workspace main landmark title 付与、iter1963-1777 invariant 不変')
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
