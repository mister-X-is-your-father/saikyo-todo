/**
 * Phase 6.15 loop iter2005: pdca-panel 集計期間 group に title 付与
 * (items-board view-switcher iter1991 / filter group iter1993 と同 group landmark pattern)。
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

  const pdca = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pdca.includes('title={`集計期間 — 現在 ${days} 日、30 / 90 から選択`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca 集計期間 group title が無い',
    })
  }

  const period = readFileSync(
    resolve(here, '../src/components/workspace/personal-period-view.tsx'),
    'utf8',
  )
  if (!period.includes('iter2003')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2003 period-goal save title が消えている',
    })
  }

  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('iter1993')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1993 filter group title が消えている',
    })
  }

  const tc = readFileSync(
    resolve(here, '../src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (!tc.includes('iter2001')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2001 team-cap-summary title が消えている',
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
    console.log('(なし) — pdca 集計期間 group title 付与、iter2003-1777 invariant 不変')
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
