/**
 * Phase 6.15 loop iter1833: schedule-item-picker footer 2 button (interrupt-add / cancel)
 * に title 付与 (iter1789 cancel / iter1831 archive-restore と同 pattern を picker footer
 * button family にも展開、schedule-picker hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/schedule/schedule-item-picker.tsx の 2 footer button:
 *     - interrupt-add: aria-label conditional (interruptNote 有無)
 *     - cancel: aria-label "キャンセル — task pick を破棄"
 *   両 button は aria-label のみで sighted は hover で割込みメモ context / cancel 効果
 *   即把握できなかった。
 *
 * 修正 (src/components/schedule/schedule-item-picker.tsx, 4 line 追加 + 3 line comment 追加):
 *   両 button に `title={同 aria-label}` 付与。aria-label / disabled / data-testid /
 *   onClick / variant 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-schedule-picker-footer-title-iter1833.ts
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

  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )

  // --- 1. interrupt-add title 付与済 ---
  if (
    !picker.includes(
      "title={`割込みとして追加 — 割込み / 休憩として追加${interruptNote ? ` (メモ: ${interruptNote})` : ''}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-picker interrupt-add title が無い',
    })
  }

  // --- 2. cancel title 付与済 ---
  if (!picker.includes('title="キャンセル — task pick を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'schedule-picker cancel title が無い',
    })
  }

  // --- 3. iter1771 picker button title={it.title} 維持 ---
  if (!picker.includes('title={it.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1771 schedule-picker button title が消えている',
    })
  }

  // --- 4. iter1831 archive-restore title 維持 ---
  const archivePanel = readFileSync(
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )
  if (
    !archivePanel.includes(
      '`復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1831 archive-restore title が消えている',
    })
  }

  // --- 5. iter1829 subtask-drag title 維持 ---
  const subtasksPanel = readFileSync(
    resolve(here, '../src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (!subtasksPanel.includes('title={`${item.title} — ドラッグで並び替え`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1829 subtask-drag title が消えている',
    })
  }

  // --- 6. iter1827 bulk-clear title 維持 ---
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
      '(なし) — schedule-picker footer 2 button に title 付与で picker hover disclosure 完備、iter1831-1777 invariant 不変',
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
