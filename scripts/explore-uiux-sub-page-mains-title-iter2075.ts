/**
 * Phase 6.15 loop iter2075: sprints/goals/pdca sub-page main landmark に title 付与
 * (workspace-main iter1965 と同 landmark hover summary pattern)。
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

  const sprintsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/sprints/page.tsx'),
    'utf8',
  )
  if (!sprintsPage.includes('title="Sprint — 計画 → 稼働 → 完了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprints sub-page main title が無い',
    })
  }

  const goalsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/goals/page.tsx'),
    'utf8',
  )
  if (!goalsPage.includes('title="OKR / Goals — Objective + Key Results"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goals sub-page main title が無い',
    })
  }

  const pdcaPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/pdca/page.tsx'),
    'utf8',
  )
  if (!pdcaPage.includes('title="PDCA — Plan / Do / Check / Act + Lead time"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'pdca sub-page main title が無い',
    })
  }

  const home = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  if (!home.includes('title="最強TODO ホーム"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter2073 home header title が消えている',
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
    console.log('(なし) — 3 sub-page main title 付与、iter2073-1777 invariant 不変')
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
