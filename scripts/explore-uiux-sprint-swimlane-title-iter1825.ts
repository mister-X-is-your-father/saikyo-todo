/**
 * Phase 6.15 loop iter1825: sprint-swimlane-disclosure summary に title 付与
 * (iter1817 goal-toggle と同 pattern を sprint-swimlane summary にも展開、
 * disclosure summary hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/sprint-swimlane-disclosure.tsx の summary は visible
 *   "担当者ビュー (swim-lane Gantt)" + aria-label conditional 2 path (open / close) で
 *   sprintName context を SR 提供だが sighted は hover で context 即把握できなかった。
 *
 * 修正 (src/components/workspace/sprint-swimlane-disclosure.tsx, 6 line 追加 + 3 line comment 追加):
 *   <summary> に `title={同 aria-label}` 付与 (conditional)。aria-label / data-testid /
 *   className 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-sprint-swimlane-title-iter1825.ts
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

  const swimlane = readFileSync(
    resolve(here, '../src/components/workspace/sprint-swimlane-disclosure.tsx'),
    'utf8',
  )

  // --- 1. summary title conditional 2 path text 維持 ---
  for (const t of [
    '`担当者ビュー (swim-lane Gantt) を閉じる — Sprint「${sprintName}」の担当者 swim-lane Gantt を閉じる`',
    '`担当者ビュー (swim-lane Gantt) を開く — Sprint「${sprintName}」の担当者 swim-lane Gantt を開く`',
  ]) {
    if (!swimlane.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-swimlane summary conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. title 件数 >= 2 (= aria-label + title with same conditional) ---
  const titleCount = (swimlane.match(/\btitle=\{/g) ?? []).length
  if (titleCount < 1) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `sprint-swimlane title 件数が ${titleCount} (期待 >= 1)`,
    })
  }

  // --- 3. data-testid 維持 ---
  if (!swimlane.includes('data-testid={`sprint-swimlane-summary-${sprintId}`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-swimlane data-testid が消えている',
    })
  }

  // --- 4. iter1823 proposal-edit-cancel title 維持 ---
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

  // --- 5. iter1821 notification-item title 維持 ---
  const bell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (
    !bell.includes(
      "title={`${formatNotificationBody(n)} — ${n.readAt ? '既読' : '未読'}${visual.label}通知 — ${formatRelativeTime(n.createdAt)}`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1821 notification-item title が消えている',
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
      '(なし) — sprint-swimlane summary に title 付与で disclosure summary hover disclosure、iter1823-1777 invariant 不変',
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
