/**
 * Phase 6.15 loop iter1901: activity-log hint chip に title 付与
 * (iter1853 sprint-status / iter1899 import-status と同 status chip family pattern)。
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

  const activity = readFileSync(
    resolve(here, '../src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (!activity.includes('title={`${hint.label} — Activity 状態`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'activity-log hint chip title が無い',
    })
  }

  const integ = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integ.includes('title={`${label} — Pull ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1899 integrations status title が消えている',
    })
  }

  const pdca = readFileSync(resolve(here, '../src/components/workspace/pdca-panel.tsx'), 'utf8')
  if (!pdca.includes('iter1895') || !pdca.includes('iter1891')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1891/1895 pdca title が消えている',
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

  const subtasks = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasks.includes('title={`このタスクには子タスクが ${grandchildren.length} 件あります`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1883 subtasks child-count title が消えている',
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
    console.log('(なし) — activity-log hint title 付与、iter1899-1777 invariant 不変')
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
