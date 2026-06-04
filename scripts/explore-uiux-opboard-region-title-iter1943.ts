/**
 * Phase 6.15 loop iter1943: operation-board-widget Card に title 付与
 * (estimate-bias 内訳 iter1917 / cycle status iter1927 と同 widget summary pattern)。
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

  const op = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!op.includes('title={`今日の作戦盤 — 期限超過')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'operation-board-widget Card title が無い',
    })
  }

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('iter1941')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1941 filter-sprint title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('title={`KR「${kr.title}」進捗 ${pct}%`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1935 KR progressbar title が消えている',
    })
  }

  const cycle = readFileSync(
    resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (!cycle.includes('title={`ステータス分布 —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1927 cycle-check ステータス分布 title が消えている',
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
    console.log('(なし) — operation-board Card title 付与、iter1941-1777 invariant 不変')
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
