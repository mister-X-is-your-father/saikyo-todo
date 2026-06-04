/**
 * Phase 6.15 loop iter1961: schedule-item-picker search input に title 付与
 * (teDate iter1955 / teCategory iter1957 と同 state-dependent input pattern)。
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

  const sip = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!sip.includes('iter1961') || !sip.includes("'task を検索 — タイトルで部分一致'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-item-picker search input title が無い',
    })
  }

  const cal = readFileSync(resolve(here, '../src/components/schedule/calendar-view.tsx'), 'utf8')
  if (!cal.includes('title={`カレンダー日付ナビゲーション —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1959 calendar-view nav group title が消えている',
    })
  }

  const cte = readFileSync(
    resolve(here, '../src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )
  if (!cte.includes('iter1957') || !cte.includes('iter1955')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1955/1957 create-time-entry title が消えている',
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
    console.log('(なし) — schedule-item-picker search title 付与、iter1959-1777 invariant 不変')
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
