/**
 * Phase 6.15 loop iter1817: goals-panel の goal-toggle button に title 付与
 * (iter1813 wf-actions / iter1815 src-actions と同 pattern を goal-toggle にも展開、
 * icon-only chevron button の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/goals-panel.tsx line 441-442 の goal-toggle button は
 *   icon-only ChevronDown/ChevronRight + aria-label `${goal.title} — Goal「${title}」の KR ...`
 *   のみで sighted は hover で KR 開閉 context 即把握できなかった。
 *
 * 修正 (src/components/workspace/goals-panel.tsx, 1 line 追加 + 3 line comment 追加):
 *   <button> に `title={同 aria-label}` 付与。aria-label / aria-controls / aria-expanded /
 *   onClick / data-testid 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-goal-toggle-title-iter1817.ts
 * 前提: なし (source 直読 invariant)
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

  const panel = readFileSync(resolve(here, '../src/components/workspace/goals-panel.tsx'), 'utf8')

  // --- 1. goal-toggle title 付与済 ---
  if (
    !panel.includes(
      "title={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-toggle button title が無い',
    })
  }

  // --- 2. goal-toggle aria-label 維持 ---
  if (
    !panel.includes(
      "aria-label={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-toggle aria-label が消えている',
    })
  }

  // --- 3. iter1815 src-* actions title 維持 ---
  const integrationsPanel = readFileSync(
    resolve(here, '../src/components/integrations/integrations-panel.tsx'),
    'utf8',
  )
  if (!integrationsPanel.includes('`削除 — Source「${src.name}」を削除`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1815 src-delete title が消えている',
    })
  }

  // --- 4. iter1813 wf-edit title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={`編集 — Workflow「${wf.name}」の graph / trigger を編集`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1813 wf-edit title が消えている',
    })
  }

  // --- 5. iter1811 wf-create title 維持 ---
  if (!wfPanel.includes("'作成 — Workflow を新規作成 (Cmd/Ctrl+Enter でも可)'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1811 wf-create default title が消えている',
    })
  }

  // --- 6. iter1809 goal-create title 維持 ---
  if (!panel.includes("'作成 — Goal を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1809 goal-create default title が消えている',
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
      '(なし) — goal-toggle button に title 付与で icon-only chevron sighted hover disclosure、iter1815-1777 invariant 不変',
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
