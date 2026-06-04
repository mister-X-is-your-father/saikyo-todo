/**
 * Phase 6.15 loop iter1919: top-items-by-time row 合計 chip に title 付与
 * (iter1915 estimate-bias-tendency と同 chip pattern)。
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

  const top = readFileSync(
    resolve(here, '../src/components/time-entry/top-items-by-time-chip.tsx'),
    'utf8',
  )
  if (!top.includes('title={`${label} — 合計`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'top-items 合計 chip title が無い',
    })
  }

  const bias = readFileSync(
    resolve(here, '../src/components/time-entry/estimate-bias-insight.tsx'),
    'utf8',
  )
  if (!bias.includes('title={`${label} — 傾向`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1915 estimate-bias tendency title が消えている',
    })
  }
  if (!bias.includes('title={`見積バイアス内訳 —')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1917 estimate-bias 内訳 grid title が消えている',
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
    console.log('(なし) — top-items 合計 chip title 付与、iter1917-1777 invariant 不変')
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
