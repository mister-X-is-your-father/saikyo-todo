/**
 * Phase 6.15 loop iter1955: create-time-entry-form teDate に title 付与
 * (filter-status iter1939 / filter-sprint iter1941 と同 state-dependent input pattern)。
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

  const cte = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!cte.includes('iter1955') || !cte.includes("if (workDate === '') return '日付")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'create-time-entry-form teDate title が無い',
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

  const atp = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!atp.includes('title={`タスクタイマー — 経過 ${formatElapsed(elapsedMs)}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1951 active-timer-panel region title が消えている',
    })
  }

  const inbox = readFileSync(resolve(here, '../src/components/workspace/inbox-view.tsx'), 'utf8')
  if (!inbox.includes('title={`Inbox view — ${inbox.length} 件、scheduledFor も期限も未設定')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1945 inbox region title が消えている',
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
    console.log('(なし) — create-time-entry teDate title 付与、iter1953-1777 invariant 不変')
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
