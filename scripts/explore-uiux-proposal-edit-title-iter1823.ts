/**
 * Phase 6.15 loop iter1823: decompose-proposals-panel proposal-edit-cancel + proposal-save
 * button に title 付与 (iter1789 comment-thread edit-cancel/save と同 pattern を proposal
 * edit footer button にも展開、proposal edit footer hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   src/components/workspace/decompose-proposals-panel.tsx の proposal edit form footer:
 *     - proposal-edit-cancel: aria-label `キャンセル — 提案「${title}」の編集を破棄`
 *     - proposal-save: aria-label conditional 2 path (pending / default)
 *   両 button は aria-label のみで sighted は hover で proposal.title context 即把握できなかった。
 *
 * 修正 (src/components/workspace/decompose-proposals-panel.tsx, 6 line 追加 + 3 line comment 追加):
 *   両 <Button> に `title={同 aria-label}` 付与 (static + conditional)。aria-label / disabled /
 *   data-testid / type / aria-busy / aria-keyshortcuts 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-proposal-edit-title-iter1823.ts
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
    resolve(here, '../src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )

  // --- 1. proposal-edit-cancel title 付与済 ---
  if (!panel.includes('title={`キャンセル — 提案「${proposal.title}」の編集を破棄`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'proposal-edit-cancel title が無い',
    })
  }

  // --- 2. proposal-save conditional 2 path text 維持 ---
  for (const t of [
    '`保存中… — 提案「${proposal.title}」の編集を保存中`',
    '`保存 — 提案「${proposal.title}」の編集を保存 (Cmd/Ctrl+Enter でも可)`',
  ]) {
    if (!panel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `proposal-save conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. proposal-edit-btn iter1748 title 維持 ---
  if (!panel.includes('title={proposal.title}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1748 proposal-edit-btn title が消えている',
    })
  }

  // --- 4. agent-cancel static title 維持 ---
  if (!panel.includes('title="実行中の Agent を中止"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'agent-cancel static title が消えている',
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

  // --- 6. iter1819 kr-add title 維持 ---
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (!goalsPanel.includes("'KR 追加 — Key Result をこの Goal に追加'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1819 kr-add default title が消えている',
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
      '(なし) — proposal-edit-cancel + proposal-save に title 付与で proposal edit footer hover disclosure 完備、iter1821-1777 invariant 不変',
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
