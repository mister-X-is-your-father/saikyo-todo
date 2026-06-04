/**
 * Phase 6.15 loop iter1911: template-items-editor dueOffset chip に title 付与
 * (notif-pref icon iter1909 / activity-actor iter1905 と同 chip context pattern)。
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

  const tmpl = readFileSync(
    resolve(here, '../src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!tmpl.includes('title={`+${it.dueOffsetDays} 日 — 期日 offset`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'template-items dueOffset chip title が無い',
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

  const deps = readFileSync(
    resolve(here, '../src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )
  if (!deps.includes('<span title={srLabel}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1907 item-deps DirectionIcon title が消えている',
    })
  }

  const activity = readFileSync(
    resolve(here, '../src/components/workspace/activity-log.tsx'),
    'utf8',
  )
  if (!activity.includes('title={`${label} — 操作種別`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1903 activity-log action icon title が消えている',
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
    console.log('(なし) — template-items dueOffset title 付与、iter1909-1777 invariant 不変')
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
