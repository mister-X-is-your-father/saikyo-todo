/**
 * Phase 6.15 loop iter1730: workspace page header の back-to-list Link に
 * data-testid="back-to-workspaces" 付与。iter1716 offline / iter1728 skip-link の
 * data-testid sweep の続編 (主要 navigation Link への testability 整備)。
 *
 * 発見した testability gap:
 *   - src/app/(workspace)/[workspaceId]/page.tsx の back-to-list Link は
 *     `<Link href="/" aria-label="一覧 — Workspace 一覧へ戻る">← 一覧</Link>`
 *   - workspace ページから workspace 一覧 (/) への戻り navigation の唯一の経路
 *   - data-testid 未設定 → Playwright で `a[href="/"]` (root へのリンク全て match) か
 *     getByText('一覧') で発見、selector fragile / text 変更で test 壊れる
 *
 * 影響: workspace ↔ list 遷移 E2E test の selector pattern が長く、auth-flow tests
 *   (workspace setup → 各 view → 戻る) を書く際に毎回 fragile な selector。
 *
 * 修正 (src/app/(workspace)/[workspaceId]/page.tsx, 1 line + 2 line comment):
 *   back-to-list Link に `data-testid="back-to-workspaces"` 付与。href / aria-label /
 *   visible span は完全不変、shadcn 編集なし、機能追加なし。
 *
 * 効果: Playwright pattern:
 *   - `await page.locator('[data-testid="back-to-workspaces"]').click()` で戻り遷移
 *   - workspace ↔ list 遷移 test の標準 selector
 *
 * 実行: pnpm tsx scripts/explore-uiux-back-to-workspaces-testid-iter1730.ts
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

  // --- 1. back-to-list Link に data-testid="back-to-workspaces" 付与済 ---
  if (!workspacePage.includes('data-testid="back-to-workspaces"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace page back-to-list Link に data-testid="back-to-workspaces" が無い',
    })
  }

  // --- 2. aria-label visible-prefix em-dash convention 維持 (iter1540) ---
  if (!workspacePage.includes('aria-label="一覧 — Workspace 一覧へ戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace page back-to-list Link の aria-label em-dash convention が消えている',
    })
  }

  // --- 3. visible "← 一覧" span aria-hidden 維持 ---
  if (!workspacePage.includes('<span aria-hidden="true">← 一覧</span>')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace page back-to-list Link の visible span aria-hidden が消えている',
    })
  }

  // --- 4. min-h-11 (44x44 tap target) 維持 (親 Button) ---
  if (
    !workspacePage.match(
      /<Button[^>]+min-h-11[^>]*>\s*\{?\s*\/\*[\s\S]*?iter1540|<Button[^>]+className="min-h-11"/,
    )
  ) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'workspace page back-to-list Link の親 Button の min-h-11 (44x44) が消えている',
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

  // --- 7. iter1727 reference invariant: gantt-view reduced-motion 維持 ---
  const ganttView = readFileSync(
    resolve(here, '../src/components/workspace/gantt-view.tsx'),
    'utf8',
  )
  if (!ganttView.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1727 gantt-view prefers-reduced-motion check が消えている',
    })
  }

  // --- 8. iter1726 reference invariant: focusElementById reduced-motion 維持 ---
  const focusUtil = readFileSync(resolve(here, '../src/lib/ui/focus-quick-add.ts'), 'utf8')
  if (!focusUtil.includes('prefers-reduced-motion: reduce')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1726 focusElementById prefers-reduced-motion check が消えている',
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — workspace page back-to-list Link に data-testid="back-to-workspaces" 付与済、iter1729 / iter1728 / iter1727 / iter1726 invariant 不変',
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
