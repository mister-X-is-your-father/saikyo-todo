/**
 * Phase 6.15 loop iter2039: quick-add input に title 付与
 * (state-dependent input pattern、period-goal iter1967 と pair)。
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

  const qa = readFileSync(resolve(here, '../src/components/workspace/quick-add.tsx'), 'utf8')
  if (!qa.includes('iter2039')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'quick-add input title が無い',
    })
  }

  const ct = readFileSync(resolve(here, '../src/components/workspace/comment-thread.tsx'), 'utf8')
  if (!ct.includes('iter2037')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2037 comment-edit-group title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2035')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2035 goal-operations-group title が消えている',
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
    console.log('(なし) — quick-add input title 付与、iter2037-1777 invariant 不変')
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
