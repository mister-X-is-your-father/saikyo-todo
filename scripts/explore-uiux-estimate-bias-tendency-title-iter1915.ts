/**
 * Phase 6.15 loop iter1915: estimate-bias-insight tendency chip に title 付与
 * (iter1901 activity-hint / iter1899 import-status と同 status chip family pattern)。
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

  const bias = readFileSync(
    resolve(here, '../src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (!bias.includes('title={`${label} — 傾向`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'estimate-bias-tendency chip title が無い',
    })
  }

  const tt = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  if (!tt.includes('title="pending — 外部同期 未実行"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1913 sync-badge-pending title が消えている',
    })
  }

  const tmpl = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tmpl.includes('title={`+${it.dueOffsetDays} 日 — 期日 offset`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1911 template-items dueOffset title が消えている',
    })
  }

  const activity = readFileSync(
    resolve(here, '../src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (!activity.includes('title={`${hint.label} — Activity 状態`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1901 activity-log hint title が消えている',
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
    console.log('(なし) — estimate-bias-tendency title 付与、iter1913-1777 invariant 不変')
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
