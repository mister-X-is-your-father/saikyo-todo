/**
 * Phase 6.15 loop iter1827: bulk-action-bar 3 button (status/delete/clear) に title 付与
 * (iter1789 comment-thread / iter1791 submit と同 pattern を bulk action にも展開、
 * bulk operation UX の sighted hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/bulk-action-bar.tsx の 3 button:
 *     - bulk-status: conditional 2 path、no title
 *     - bulk-delete: conditional 2 path、no title (soft delete 説明含む)
 *     - bulk-clear: static "解除 — 選択を全て解除"、no title
 *   は aria-label のみで sighted は hover で count + status target context 即把握できなかった。
 *
 * 修正 (src/components/workspace/bulk-action-bar.tsx, 14 line 追加 + 2 line comment 追加):
 *   3 <Button> に `title={同 aria-label}` 付与 (static + conditional)。aria-label / disabled /
 *   data-testid / variant / onClick / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-bulk-actions-title-iter1827.ts
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

  const bar = readFileSync(resolve(here, '../src/components/workspace/bulk-action-bar.tsx'), 'utf8')

  // --- 1. bulk-status title 2 path text 維持 ---
  for (const t of [
    '`${s.label} に変更中… — 選択 ${count} 件のステータスを変更中`',
    '`${s.label} に変更 — 選択 ${count} 件を「${s.label}」に変更`',
  ]) {
    if (!bar.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `bulk-status conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. bulk-delete title 2 path text 維持 ---
  for (const t of [
    '`削除中… — 選択 ${count} 件を削除中 (soft delete: ゴミ箱で 30 日保持)`',
    '`削除 — 選択 ${count} 件を削除 (soft delete: ゴミ箱で 30 日保持)`',
  ]) {
    if (!bar.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `bulk-delete conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. bulk-clear title 維持 ---
  if (!bar.includes('title="解除 — 選択を全て解除"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'bulk-clear title が無い',
    })
  }

  // --- 4. bulk-action-bar title 件数 >= 3 ---
  const titleCount = (bar.match(/\btitle=(\{|")/g) ?? []).length
  if (titleCount < 3) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `bulk-action-bar title 件数が ${titleCount} (期待 >= 3)`,
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

  // --- 6. iter1823 proposal-edit-cancel title 維持 ---
  const decomposePanel = readFileSync(
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!decomposePanel.includes('title={`キャンセル — 提案「${proposal.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1823 proposal-edit-cancel title が消えている',
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
      '(なし) — bulk-action-bar 3 button に title 付与で bulk operation UX hover disclosure 完備、iter1825-1777 invariant 不変',
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
