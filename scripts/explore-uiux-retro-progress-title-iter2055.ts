/**
 * Phase 6.15 loop iter2055: sprint-retro-widget progressbar に title 付与
 * (5 progressbar family の完成形、sprint/goal/KR/budget + Sprint Retro)。
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

  const retro = readFileSync(
    resolve(here, '../src/components/sprint/sprint-retro-widget.tsx'),
    'utf8',
  )
  if (!retro.includes('iter2055') || !retro.includes('title={`Sprint Retro 完了率')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-retro progressbar title が無い',
    })
  }

  const bp = readFileSync(resolve(here, '../src/components/workspace/budget-panel.tsx'), 'utf8')
  if (!bp.includes('iter2051')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2051 budget progressbar title が消えている',
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
    console.log('(なし) — sprint-retro progressbar title 付与、iter2051-1777 invariant 不変')
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
