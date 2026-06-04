/**
 * Phase 6.15 loop iter2247: Gantt chart root container に title 付与し aria-label と sync
 * (Gantt project summary iter2117 は title 付き、parent container も title 完備)。
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

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (
    !gv.includes('iter2247') ||
    !gv.includes(
      'title={`Gantt チャート — Item ${withDates.length} 件 × 期間 ${totalSpanDays} 日`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'gantt-view root title が aria-label と sync されていない',
    })
  }
  // aria-label + title 計 2 出現
  const ganttText = (
    gv.match(/Gantt チャート — Item \$\{withDates\.length\} 件 × 期間 \$\{totalSpanDays\} 日/g) ||
    []
  ).length
  if (ganttText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `gantt root 'Gantt チャート — Item ...' 出現 ${ganttText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const tib = readFileSync(
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (!tib.includes('iter2245')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2245 weekly-time-trend-chip title が消えている',
    })
  }

  const sp = readFileSync(resolve(here, '../src/components/workspace/subtasks-panel.tsx'), 'utf8')
  if (!sp.includes('iter2243')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2243 subtasks-panel ol title が消えている',
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
    console.log('(なし) — Gantt chart root container title sync 完了')
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
