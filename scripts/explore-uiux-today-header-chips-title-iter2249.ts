/**
 * Phase 6.15 loop iter2249: today-view の 2 header chip (streak / doneToday) に
 * title 付与し aria-label と sync (today-header chip 2 element pair 完成)。
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

  const tv = readFileSync(resolve(here, '../src/components/workspace/today-view.tsx'), 'utf8')
  if (!tv.includes('iter2249')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'today-view iter2249 marker が無い',
    })
  }
  // streak chip: aria-label + title 計 2 出現
  const streakText = (tv.match(/完了 streak — \$\{streakSignals\.milestone\.text\}/g) || []).length
  if (streakText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `streak chip 出現 ${streakText} 回、aria-label + title 計 2 回必要`,
    })
  }
  // doneToday chip: aria-label + title 計 2 出現
  const doneText = (tv.match(/\$\{doneTodaySignal\.text\}\$\{doneTodayPriorityDetail\}/g) || [])
    .length
  if (doneText < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `doneToday chip 出現 ${doneText} 回、aria-label + title 計 2 回必要`,
    })
  }

  const gv = readFileSync(resolve(here, '../src/components/workspace/gantt-view.tsx'), 'utf8')
  if (!gv.includes('iter2247')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2247 gantt-view root title が消えている',
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
    console.log('(なし) — today-view header chips 2 element title sync 完了 (streak / doneToday)')
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
