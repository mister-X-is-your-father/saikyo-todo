/**
 * Phase 6.15 loop iter2025: sprints-panel sprint-create startDate input に title 付与
 * (sprint-edit-start/end iter2017/2019 と pair、sprints-panel 全 date input sweep 完備)。
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

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('iter2025') || !sp.includes('Sprint 開始日 (必須、終了日以前)')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-create start input title が無い',
    })
  }
  if (!sp.includes('iter2017') || !sp.includes('iter2019')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2017/2019 sprint-edit title が消えている',
    })
  }

  const gp = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')
  if (!gp.includes('iter2023') || !gp.includes('iter2021')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2021/2023 goal date input title が消えている',
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
    console.log('(なし) — sprint-create start input title 付与、iter2023-1777 invariant 不変')
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
