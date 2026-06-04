/**
 * Phase 6.15 loop iter1731: workspace page の 8 nav Links (Goals / Sprints / PDCA /
 * Templates / Workflows / API 連携 / Time Entries / Archive) に data-testid="nav-*"
 * を一括付与。iter1730 back-to-workspaces sweep の続編 (workspace nav 全 link testability)。
 *
 * 発見した testability gap:
 *   - 8 nav Links は aria-label / href / visible text を持つが data-testid 未設定
 *   - Playwright で `a[href="/${workspaceId}/goals"]` (動的 workspaceId) か
 *     `getByText('Goals')` で発見、selector dynamic / fragile
 *   - workspace nav 経由の各 view 遷移 test (E2E auth flow) が冗長
 *
 * 修正 (src/app/(workspace)/[workspaceId]/page.tsx, 8 line 追加 + 4 line comment):
 *   - Goals → data-testid="nav-goals"
 *   - Sprints → data-testid="nav-sprints"
 *   - PDCA → data-testid="nav-pdca"
 *   - Templates → data-testid="nav-templates"
 *   - Workflows → data-testid="nav-workflows"
 *   - API 連携 → data-testid="nav-integrations" (内部 route 名と一致)
 *   - Time Entries → data-testid="nav-time-entries"
 *   - Archive → data-testid="nav-archive"
 *   - aria-label / href / visible text 全て不変、shadcn 編集なし、機能追加なし
 *
 * 効果: Playwright pattern:
 *   - `await page.locator('[data-testid="nav-goals"]').click()` で Goals 遷移
 *   - `await page.locator('[data-testid^="nav-"]').count()` で nav link 数を確認
 *   - workspace nav 全 link を統一 selector で test 可能
 *
 * 実行: pnpm tsx scripts/explore-uiux-workspace-nav-testid-iter1731.ts
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

  const workspacePage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )

  // --- 1. 8 nav-* data-testid 全て付与済 ---
  const expectedTestIds = [
    'nav-goals',
    'nav-sprints',
    'nav-pdca',
    'nav-templates',
    'nav-workflows',
    'nav-integrations',
    'nav-time-entries',
    'nav-archive',
  ]
  for (const tid of expectedTestIds) {
    if (!workspacePage.includes(`data-testid="${tid}"`)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace page nav Link に data-testid="${tid}" が無い`,
      })
    }
  }

  // --- 2. data-testid="nav-*" の total 件数 = 8 ---
  const navTestIdMatches = workspacePage.match(/data-testid="nav-[a-z-]+"/g) ?? []
  if (navTestIdMatches.length !== 8) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `workspace page nav-* data-testid 件数が ${navTestIdMatches.length} (期待 8)`,
    })
  }

  // --- 3. 各 nav Link の aria-label em-dash convention 不変 ---
  for (const ariaLabel of [
    'Goals — OKR / Goals (Objective + Key Results) ページへ移動',
    'Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動',
    'PDCA — Plan / Do / Check / Act + Lead time ページへ移動',
    'Templates — ワークパッケージ定義 ページへ移動',
    'Workflows — 自動化ワークフロー (n8n 風) ページへ移動',
    'API 連携 — 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動',
    'Time Entries — 稼働入力 やったこと + 時間を記録 ページへ移動',
    'Archive — アーカイブ済 Item 一覧 ページへ移動',
  ]) {
    if (!workspacePage.includes(`aria-label="${ariaLabel}"`)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `workspace page で aria-label "${ariaLabel.slice(0, 30)}..." が消えている`,
      })
    }
  }

  // --- 4. iter1730 reference invariant: back-to-workspaces data-testid 維持 ---
  if (!workspacePage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1730 back-to-workspaces data-testid が消えている',
    })
  }

  // --- 5. iter1729 reference invariant: noscript data-testid 維持 ---
  const rootLayout = readFileSync(resolve(here, '../src/app/layout.tsx'), 'utf8')
  if (!rootLayout.includes('data-testid="noscript-warning"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1729 noscript-warning data-testid が消えている',
    })
  }

  // --- 6. iter1728 reference invariant: skip-link data-testid 維持 ---
  if (!rootLayout.includes('data-testid="skip-to-main"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1728 skip-to-main data-testid が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workspace page 8 nav Links に data-testid="nav-*" 一括付与済、iter1730 / iter1729 / iter1728 invariant 不変',
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
