/**
 * Phase 6.15 loop iter1913: time-entries sync-badge-pending に title 付与
 * (synced/failed iter1701 と 3 badge symmetry 統一)。
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

  const tt = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )
  // 3 badge 全部に title が無いと不可、symmetry 検査
  for (const status of ['synced', 'failed', 'pending']) {
    if (
      !tt.includes(
        `title="${status} — 外部同期 ${status === 'pending' ? '未実行' : status === 'synced' ? '完了' : '失敗'}"`,
      )
    ) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sync-badge-${status} title が無い`,
      })
    }
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

  const notif = readFileSync(
    resolve(here, '../src/components/workspace/notification-preferences.tsx'),
    'utf8',
  )
  if (!notif.includes('title={`${visual.label}通知`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1909 notif-pref icon title が消えている',
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
    console.log(
      '(なし) — sync-badge-pending title 付与 (3 badge symmetry)、iter1911-1777 invariant 不変',
    )
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
