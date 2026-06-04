/**
 * Phase 6.15 loop iter1801: workspace 8 sub-page back-to-Workspace Link + workspace home
 * back-to-workspaces Link に title 付与 (iter1779 nav 8 link / iter1781 logout と同 pattern を
 * back-link family にも展開、navigation UX の sighted hover disclosure)。
 *
 * 発見した UX gap (sighted only):
 *   - src/app/(workspace)/[workspaceId]/{goals,sprints,pdca,templates,workflows,integrations,
 *     time-entries,archive}/page.tsx の 8 back-to-Workspace Link は aria-label
 *     "Workspace dashboard に戻る" のみ、no title
 *   - src/app/(workspace)/[workspaceId]/page.tsx back-to-workspaces Link も title 無し
 *   どちらも visible "← Workspace" / "← 一覧" のみで sighted は hover で遷移先 context
 *   即把握できなかった (aria-label は browser tooltip にならない)。
 *
 * 修正 (9 file 各 1 line: aria-label の後に title 付与):
 *   全 <Link> に `title={同 aria-label}` 付与。aria-label / href / data-testid /
 *   visible text 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-back-links-title-iter1801.ts
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

  // --- 1-8. workspace 8 sub-page back-to-Workspace title 付与済 ---
  const subPages = [
    'goals',
    'sprints',
    'pdca',
    'templates',
    'workflows',
    'integrations',
    'time-entries',
    'archive',
  ]
  for (const sub of subPages) {
    const src = readFileSync(
      resolve(here, `../src/app/(workspace)/[workspaceId]/${sub}/page.tsx`),
      'utf8',
    )
    if (!src.includes('title="Workspace dashboard に戻る"')) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `[1] ${sub} sub-page back-to-Workspace title が無い`,
      })
    }
  }

  // --- 9. workspace home back-to-workspaces title 付与済 ---
  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!wsPage.includes('title="一覧 — Workspace 一覧へ戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace home back-to-workspaces title が無い',
    })
  }

  // --- 10. iter1730 back-to-workspaces data-testid 維持 ---
  if (!wsPage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1730 back-to-workspaces data-testid が消えている',
    })
  }

  // --- 11. iter1799 create-workspace-submit title 維持 ---
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
      message: 'iter1799 create-workspace-submit title が消えている',
    })
  }

  // --- 12. iter1779 workspace nav Goals title 維持 ---
  if (!wsPage.includes('title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1779 workspace nav Goals title が消えている',
    })
  }

  // --- 13. iter1777 view-switcher Today title 維持 ---
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
      '(なし) — 8 sub-page back-to-Workspace + 1 home back-to-workspaces (= 9 Link) に title 付与で navigation UX sighted hover disclosure、iter1799-1777 invariant 不変',
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
