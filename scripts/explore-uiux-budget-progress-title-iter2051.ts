/**
 * Phase 6.15 loop iter2051: budget-panel progressbar に title 付与
 * (4 progressbar family の 4 個目、sprint/goal/KR iter1931-1935 と pair)。
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

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2051') || !bp.includes('title={`AI 月次コスト消費率')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'budget-panel progressbar title が無い',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')
  if (!sp.includes('title={`Sprint「${sprint.name}」完了率 ${pct}% —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1931 sprint progressbar title が消えている',
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
    console.log('(なし) — budget progressbar title 付与、iter2049-1777 invariant 不変')
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
