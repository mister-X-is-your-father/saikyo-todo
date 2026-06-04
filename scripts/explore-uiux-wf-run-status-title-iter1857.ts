/**
 * Phase 6.15 loop iter1857: wf-run-status Badge に title 付与
 * (iter1853 sprint-status / iter1855 goal-status と同 pattern、status Badge family hover disclosure 完備)。
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

  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  if (!wfPanel.includes('title={`${label} — 実行ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-status Badge title が無い',
    })
  }

  if (!wfPanel.includes('aria-label={`${label} — 実行ステータス`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'wf-run-status Badge aria-label が消えている',
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

  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  if (
    !sprintsPanel.includes(
      'title={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1853 sprint-status title が消えている',
    })
  }

  const timer = readFileSync(
    resolve(here, '../src/components/workspace/active-timer-panel.tsx'),
    'utf8',
  )
  if (!timer.includes('title={`${calibrated.calibratedMinutes}分 — 校正後')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1851 calibrated chip title が消えている',
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
    console.log(
      '(なし) — wf-run-status Badge に title 付与で status Badge family hover disclosure 完備、iter1855-1777 invariant 不変',
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
