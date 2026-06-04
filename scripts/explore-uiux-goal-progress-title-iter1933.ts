/**
 * Phase 6.15 loop iter1933: goals-panel progressbar に title 付与
 * (sprints-panel progressbar iter1931 と pair)。
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

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('title={`Goal「${goal.title}」全体進捗 ${goalPct}%')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel progressbar title が無い',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('title={`Sprint「${sprint.name}」完了率 ${pct}% —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1931 sprints-panel progressbar title が消えている',
    })
  }

  const wfg = readFileSync(
    resolve(here, '../src/components/workflow/workflow-graph-canvas.tsx'),
    'utf8',
  )
  if (!wfg.includes('title={`Workflow graph —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1929 workflow-graph-canvas title が消えている',
    })
  }

  const cycle = readFileSync(
    resolve(here, '../src/components/pdca/cycle-check-stats-card.tsx'),
    'utf8',
  )
  if (!cycle.includes('title={`ステータス分布 —') || !cycle.includes('title={`Lead time 統計 —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1925/1927 cycle-check title が消えている',
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
    console.log('(なし) — goals-panel progressbar title 付与、iter1931-1777 invariant 不変')
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
