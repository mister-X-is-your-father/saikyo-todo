/**
 * Phase 6.15 loop iter1853: sprint-status Badge に title 付与
 * (iter1841 StatusBadge / iter1851 calibrated と同 pattern を sprint-status Badge にも展開、
 * sprint name context sighted hover disclosure)。
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

  const panel = readFileSync(resolve(here, '../src/components/workspace/sprints-panel.tsx'), 'utf8')

  // --- 1. sprint-status Badge title 付与済 ---
  if (
    !panel.includes(
      'title={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-status Badge title が無い',
    })
  }

  // --- 2. sprint-status Badge aria-label 維持 ---
  if (
    !panel.includes(
      'aria-label={`${sprintStatusLabelJa(status)} — Sprint「${sprint.name}」のステータス`}',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-status Badge aria-label が消えている',
    })
  }

  // --- 3. iter1851 calibrated chip title 維持 ---
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

  // --- 4. iter1843 MustBadge title 維持 ---
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

  // --- 5. iter1841 StatusBadge title 維持 ---
  const statusBadge = readFileSync(
    resolve(here, '../src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  if (!statusBadge.includes('title={`${cfg.shortLabel} — ステータス ${cfg.label}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1841 StatusBadge title が消えている',
    })
  }

  // --- 6. iter1809 sprint-create title 維持 ---
  if (!panel.includes("'作成 — Sprint を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1809 sprint-create default title が消えている',
    })
  }

  // --- 7. iter1799 create-workspace title 維持 ---
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

  // --- 8. iter1777 view-switcher Today title 維持 ---
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
      '(なし) — sprint-status Badge に title 付与で sprint name context sighted hover disclose、iter1851-1777 invariant 不変',
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
