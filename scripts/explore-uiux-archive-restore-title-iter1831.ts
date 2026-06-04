/**
 * Phase 6.15 loop iter1831: archived-items-panel archive-restore button に title 付与
 * (iter1787 ItemEditDialog unarchive と同 pattern を archive-restore にも展開、
 * archive 復元 UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/archived-items-panel.tsx の archive-restore button は
 *   visible "復元" + aria-label conditional 2 path で item context + archive date 提供だが
 *   sighted は hover で context 即把握できなかった。
 *
 * 修正 (src/components/workspace/archived-items-panel.tsx, 6 line 追加 + 1 line comment 追加):
 *   <Button> に `title={同 aria-label}` 付与 (conditional)。aria-label / disabled /
 *   data-testid / variant / onClick / aria-busy 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-archive-restore-title-iter1831.ts
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
    resolve(here, '../src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )

  // --- 1. archive-restore title conditional 2 path text 維持 ---
  for (const t of [
    '`復元中… — 「${item.title}」を復元中…`',
    '`復元 — 「${item.title}」を復元 (${fmt(item.archivedAt)} にアーカイブ)`',
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `archive-restore conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. archive-restore data-testid 維持 ---
  if (!panel.includes('data-testid={`archive-restore-${item.id}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'archive-restore data-testid が消えている',
    })
  }

  // --- 3. iter1737 archived-items item.title truncate title 維持 ---
  if (!panel.includes('title={item.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1737 archived-items item.title title が消えている',
    })
  }

  // --- 4. iter1829 subtask-drag title 維持 ---
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

  // --- 5. iter1827 bulk-clear title 維持 ---
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
      '(なし) — archive-restore に title 付与で archive 復元 UX hover disclosure、iter1829-1777 invariant 不変',
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
