/**
 * Phase 6.15 loop iter1983: goals-panel goal-title input に title 付与
 * (8 state-dependent input family の続編、sprint-name/goal iter1979/1981 pattern)。
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
  if (!gp.includes('iter1983') || !gp.includes('Goal Objective (必須、最大 200 文字')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals-panel goal-title input title が無い',
    })
  }
  if (!gp.includes('title={`KR「${kr.title}」進捗 ${pct}%`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1935 KR progressbar title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter1981') || !sp.includes('iter1979')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1979/1981 sprints-panel title が消えている',
    })
  }

  const wfp = readFileSync(resolve(here, '../src/components/workflow/workflows-panel.tsx'), 'utf8')
  if (!wfp.includes('iter1977') || !wfp.includes('iter1975')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1975/1977 workflows-panel title が消えている',
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
    console.log('(なし) — goals-panel goal-title input title 付与、iter1981-1777 invariant 不変')
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
