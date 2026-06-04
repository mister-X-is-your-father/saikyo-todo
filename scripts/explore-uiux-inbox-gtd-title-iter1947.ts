/**
 * Phase 6.15 loop iter1947: inbox-view GTD 分類 group に title 付与
 * (inbox-region iter1945 と同 file 内 sweep)。
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

  const inbox = readFileSync(resolve(here, '../src/components/workspace/inbox-view.tsx'), 'utf8')
  if (!inbox.includes('title={`GTD 分類 — 2 分以内')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'inbox-view GTD 分類 group title が無い',
    })
  }
  if (!inbox.includes('title={`Inbox view — ${inbox.length} 件、scheduledFor も期限も未設定')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1945 inbox region title が消えている',
    })
  }
  if (!inbox.includes('title={`${healthChip.label} — Inbox 健全性`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1861 inbox-health-hint title が消えている',
    })
  }

  const op = readFileSync(
    resolve(here, '../src/components/workspace/operation-board-widget.tsx'),
    'utf8',
  )
  if (!op.includes('title={`今日の作戦盤 — 期限超過')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1943 op-board title が消えている',
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
    console.log('(なし) — inbox GTD 分類 group title 付与、iter1945-1777 invariant 不変')
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
