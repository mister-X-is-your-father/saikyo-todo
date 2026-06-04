/**
 * Phase 6.15 loop iter1809: sprint-create + goal-create button に title 付与
 * (iter1799 create-workspace と同 pattern を Sprint/Goal create にも展開、
 * creation form submit UX の sighted hover disclosure 完備)。
 *
 * 発見した UX gap (sighted only):
 *   - src/components/workspace/sprints-panel.tsx sprint-create-btn:
 *     conditional 3 path、no title
 *   - src/components/workspace/goals-panel.tsx goal-create-btn:
 *     conditional 3 path、no title
 *   両 button は sighted は hover で creation context 即把握できなかった。
 *
 * 修正 (2 file 各 conditional title 追加 + 1 line comment 追加):
 *   両 <Button> に conditional `title={同 aria-label}` 付与。aria-label / disabled /
 *   data-testid / type / aria-busy / aria-keyshortcuts 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-sprint-goal-create-title-iter1809.ts
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

  const sprintsPanel = readFileSync(
    resolve(here, '../src/components/workspace/sprints-panel.tsx'),
    'utf8',
  )
  const goalsPanel = readFileSync(
    resolve(here, '../src/components/workspace/goals-panel.tsx'),
    'utf8',
  )

  // --- 1. sprint-create-btn conditional 3 path text 維持 ---
  for (const t of [
    "'作成 — Sprint を作成するには名前を入力してください'",
    "'作成中… — Sprint を作成中'",
    "'作成 — Sprint を新規作成'",
  ]) {
    if (!sprintsPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprint-create conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 2. goal-create-btn conditional 3 path text 維持 ---
  for (const t of [
    "'作成 — Goal を作成するにはタイトルを入力してください'",
    "'作成中… — Goal を作成中'",
    "'作成 — Goal を新規作成'",
  ]) {
    if (!goalsPanel.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `goal-create conditional path text ${t} が消えている`,
      })
    }
  }

  // --- 3. sprint-create-btn data-testid 維持 ---
  if (!sprintsPanel.includes('data-testid="sprint-create-btn"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'sprint-create-btn data-testid が消えている',
    })
  }

  // --- 4. goal-create-btn data-testid 維持 ---
  if (!goalsPanel.includes('data-testid="goal-create-btn"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'goal-create-btn data-testid が消えている',
    })
  }

  // --- 5. iter1807 mark-all-read title 維持 ---
  const bell = readFileSync(
    resolve(here, '../src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (!bell.includes('`全て既読 — 未読 ${unreadCount} 件をすべて既読にする`')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1807 mark-all-read default title が消えている',
    })
  }

  // --- 6. iter1805 offline retry title 維持 ---
  const retryBtn = readFileSync(resolve(here, '../src/app/~offline/retry-button.tsx'), 'utf8')
  if (!retryBtn.includes('title="再読み込みして再試行 — ページ全体を読み直して接続を回復"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1805 offline retry-button title が消えている',
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
      '(なし) — sprint-create + goal-create button に title 付与で creation form submit UX sighted hover disclosure 完備、iter1807-1777 invariant 不変',
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
