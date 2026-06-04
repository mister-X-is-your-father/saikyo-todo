/**
 * Phase 6.15 loop iter1829: subtasks-panel subtask-drag (icon-only GripVertical) に title 付与
 * (iter1817 goal-toggle / iter1827 bulk-action と同 pattern を drag handle にも展開、
 * DnD handle hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/subtasks-panel.tsx の subtask-drag button は icon-only
 *   GripVertical + aria-label `${item.title} — ドラッグで並び替え` で item context を SR 提供だが
 *   sighted は hover で context 即把握できなかった (visible text 無 + browser tooltip 無)。
 *
 * 修正 (src/components/workspace/subtasks-panel.tsx, 1 line 追加 + 1 line comment 追加):
 *   <button> に `title={同 aria-label}` 付与。aria-label / className / data-testid /
 *   attributes / listeners 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-subtask-drag-title-iter1829.ts
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

  const panel = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )

  // --- 1. subtask-drag title 付与済 ---
  if (!panel.includes('title={`${item.title} — ドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-drag title が無い',
    })
  }

  // --- 2. subtask-drag aria-label 維持 ---
  if (!panel.includes('aria-label={`${item.title} — ドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'subtask-drag aria-label が消えている',
    })
  }

  // --- 3. iter1751 subtasks-panel item.title truncate title 維持 ---
  if (!panel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1751 subtasks item.title truncate title が消えている',
    })
  }

  // --- 4. iter1827 bulk-clear title 維持 ---
  const bulkBar = readFileSync(
    resolve(here, '../src/components/workspace/bulk-action-bar.tsx'),
    'utf8',
  )
  if (!bulkBar.includes('title="解除 — 選択を全て解除"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1827 bulk-clear title が消えている',
    })
  }

  // --- 5. iter1825 sprint-swimlane title 維持 ---
  const swimlane = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )
  if (
    !swimlane.includes(
      '`担当者ビュー (swim-lane Gantt) を開く — Sprint「${sprintName}」の担当者 swim-lane Gantt を開く`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1825 sprint-swimlane title が消えている',
    })
  }

  // --- 6. iter1817 goal-toggle title 維持 ---
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (
    !goalsPanel.includes(
      "title={`${goal.title} — Goal「${goal.title}」の KR ${open ? '一覧を閉じる' : '一覧を開く'}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1817 goal-toggle title が消えている',
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
      '(なし) — subtask-drag に title 付与で DnD handle hover disclosure、iter1827-1777 invariant 不変',
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
