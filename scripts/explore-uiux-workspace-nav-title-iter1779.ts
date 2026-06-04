/**
 * Phase 6.15 loop iter1779: workspace nav 8 Link に title 付与
 * (Goals/Sprints/PDCA/Templates/Workflows/API 連携/Time Entries/Archive)。
 * iter1777 view-switcher と同 pattern を workspace nav にも展開、nav 各 link の
 * sighted hover で遷移先 descriptive context disclose。
 *
 * 発見した UX gap (sighted only):
 *   src/app/(workspace)/[workspaceId]/page.tsx の 8 nav Link は visible text のみ
 *   ("Goals" 等) + aria-label で descriptive context (= "OKR / Goals ... ページへ移動" 等)
 *   を SR 提供だが、sighted は hover で各 nav 遷移先即把握できなかった (aria-label は
 *   browser tooltip にならない)。
 *
 * 修正 (src/app/(workspace)/[workspaceId]/page.tsx, 8 line 追加 + 5 line comment 追加):
 *   8 <Link> 全てに `title={同 aria-label}` 付与。aria-label / href / data-testid /
 *   visible text 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-workspace-nav-title-iter1779.ts
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

  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )

  // --- 1. 8 nav Link title 付与済 (literal text check) ---
  const expectedTitles = [
    'title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"',
    'title="Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動"',
    'title="PDCA — Plan / Do / Check / Act + Lead time ページへ移動"',
    'title="Templates — ワークパッケージ定義 ページへ移動"',
    'title="Workflows — 自動化ワークフロー (n8n 風) ページへ移動"',
    'title="API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"',
    'title="Time Entries — 稼働入力 やったこと + 時間を記録 ページへ移動"',
    'title="Archive — アーカイブ済 Item 一覧 ページへ移動"',
  ]
  for (const t of expectedTitles) {
    if (!wsPage.includes(t)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace page nav ${t} が無い`,
      })
    }
  }

  // --- 2. iter1731 nav-* data-testid 8 件維持 ---
  const navTestIds = (wsPage.match(/data-testid="nav-[a-z-]+"/g) ?? []).length
  if (navTestIds !== 8) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `iter1731 nav-* data-testid 件数 ${navTestIds} (期待 8)`,
    })
  }

  // --- 3. iter1730 back-to-workspaces 維持 ---
  if (!wsPage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1730 back-to-workspaces data-testid が消えている',
    })
  }

  // --- 4. iter1777 items-board view-switcher title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  // --- 5. iter1775 calendar today title 維持 ---
  const calendarView = readFileSync(
    resolve(here, '../src/components/schedule/calendar-view.tsx'),
    'utf8',
  )
  if (
    !calendarView.includes(
      "title={`今日 — 表示日を今日 (${format(new Date(), 'M月d日 (eee)')}) にリセット`}",
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1775 calendar today title が消えている',
    })
  }

  // --- 6. iter1769 workflows-panel description title 維持 ---
  const wfPanel = readFileSync(
    resolve(here, '../src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )
  if (!wfPanel.includes('title={wf.description}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1769 workflows-panel description title が消えている',
    })
  }

  // --- 7. iter1767 ErrorState retry title 維持 ---
  const asyncStates = readFileSync(
    resolve(here, '../src/components/shared/async-states.tsx'),
    'utf8',
  )
  if (!asyncStates.includes('title={`再試行 — 「${message}」をクリアして再試行`}')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1767 ErrorState retry title が消えている',
    })
  }

  // --- 8. iter1732 prefers-reduced-motion helper 維持 ---
  const helper = readFileSync(resolve(here, '../src/lib/ui/prefers-reduced-motion.ts'), 'utf8')
  if (!helper.includes('export function prefersReducedMotion')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1732 prefers-reduced-motion helper が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workspace nav 8 Link に title 付与で sighted hover で各 nav 遷移先 disclose、iter1777-1732 invariant 不変',
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
