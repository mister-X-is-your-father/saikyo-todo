/**
 * Phase 6.15 loop iter1835: WorkspaceHeader role Badge に title 付与
 * (iter1817 goal-toggle と同 pattern を role Badge にも展開、Badge hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/workspace-header.tsx の role Badge は visible role text
 *   (例: "owner" / "member") + aria-label `${role} — あなたの workspace role` で
 *   context を SR 提供だが sighted は hover で role context 即把握できなかった
 *   (role 単語の意味づけ "あなたの workspace role" が SR-only)。
 *
 * 修正 (src/components/workspace/workspace-header.tsx, 1 line 追加 + 2 line comment 追加):
 *   <Badge> に `title={同 aria-label}` 付与。aria-label / role / className / variant
 *   完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-workspace-role-badge-title-iter1835.ts
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

  const header = readFileSync(
    resolve(here, '../src/components/workspace/workspace-header.tsx'),
    'utf8',
  )

  // --- 1. role Badge title 付与済 ---
  if (!header.includes('title={`${role} — あなたの workspace role`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'role Badge title が無い',
    })
  }

  // --- 2. iter1749 h1 title + subtitle title 維持 ---
  if (!header.includes('title={title}') || !header.includes('title={subtitle}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1749 h1 / subtitle title が消えている',
    })
  }

  // --- 3. iter1833 schedule-picker cancel title 維持 ---
  const picker = readFileSync(
    resolve(here, '../src/components/schedule/schedule-item-picker.tsx'),
    'utf8',
  )
  if (!picker.includes('title="キャンセル — task pick を破棄"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1833 schedule-picker cancel title が消えている',
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
      '(なし) — WorkspaceHeader role Badge に title 付与で Badge hover disclosure、iter1833-1777 invariant 不変',
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
