/**
 * Phase 6.15 loop iter1859: time-entries-table sync-badge synced + failed に title 付与
 * (iter1853-1857 status Badge family と同 pattern を sync-badge にも展開)。
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

  const table = readFileSync(
    resolve(here, '../src/components/time-entry/time-entries-table.tsx'),
    'utf8',
  )

  if (!table.includes('title="synced — 外部同期 完了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sync-badge-synced title が無い',
    })
  }

  if (!table.includes('title="failed — 外部同期 失敗"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sync-badge-failed title が無い',
    })
  }

  if (!table.includes('aria-label="synced — 外部同期 完了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sync-badge-synced aria-label が消えている',
    })
  }

  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={`${label} — 実行ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1857 wf-run-status title が消えている',
    })
  }

  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    !goalsPanel.includes(
      'title={`${goalStatusLabelJa(status)} — Goal「${goal.title}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1855 goal-status title が消えている',
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

  const createWs = readFileSync(
    resolve(here, '../src/components/workspace/create-workspace-form.tsx'),
    'utf8',
  )
  if (
    !createWs.includes(
      "title={isPending ? '作成中… — Workspace を作成中' : '作成 — Workspace を新規作成'}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1799 create-workspace title が消えている',
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
    console.log('(なし) — sync-badge synced + failed に title 付与、iter1857-1777 invariant 不変')
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
