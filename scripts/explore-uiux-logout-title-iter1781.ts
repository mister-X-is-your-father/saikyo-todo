/**
 * Phase 6.15 loop iter1781: home page + mock-top-nav の logout button に title 付与
 * (iter1777 view-switcher / iter1779 workspace nav と同 pattern を logout button family
 * にも展開、logout UX の sighted ↔ SR 同期)。
 *
 * 発見した UX gap (sighted only):
 *   src/app/page.tsx line 46-55 + src/components/mock-timesheet/mock-top-nav.tsx
 *   line 71-79 の logout button は visible text "ログアウト" のみ + aria-label で
 *   descriptive context (遷移先 / session 終了 context) を SR 提供だが、sighted は
 *   hover で context (= "ログイン画面に戻る" / "mock-timesheet session を終了") 即把握できず
 *   (aria-label は browser tooltip にならない)。
 *
 * 修正 (2 file 各 1 line 追加 + 4 line comment 追加):
 *   両 <Button> に `title={同 aria-label}` 付与。aria-label / variant / className /
 *   type / data-testid 完全不変、shadcn 編集なし、機能追加なし。
 *
 * 実行: pnpm tsx scripts/explore-uiux-logout-title-iter1781.ts
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

  const homePage = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')
  const mockTopNav = readFileSync(
    resolve(here, '../src/components/mock-timesheet/mock-top-nav.tsx'),
    'utf8',
  )

  // --- 1. home page logout button に title 付与済 ---
  if (!homePage.includes('title="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'home page logout button に title が無い',
    })
  }

  // --- 2. mock-top-nav logout button に title 付与済 ---
  if (!mockTopNav.includes('title="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'mock-top-nav logout button に title が無い',
    })
  }

  // --- 3. home page logout aria-label 維持 (iter1724 em-dash) ---
  if (!homePage.includes('aria-label="ログアウト — ログイン画面に戻る"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1724 home page logout em-dash aria-label が消えている',
    })
  }

  // --- 4. mock-top-nav logout aria-label 維持 (iter1095) ---
  if (!mockTopNav.includes('aria-label="ログアウト — mock-timesheet session を終了"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1095 mock-top-nav logout em-dash aria-label が消えている',
    })
  }

  // --- 5. iter1779 workspace nav 8 Link title 維持 ---
  const wsPage = readFileSync(
    resolve(here, '../src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )
  if (!wsPage.includes('title="Goals — OKR / Goals (Objective + Key Results) ページへ移動"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1779 workspace nav Goals title が消えている',
    })
  }

  // --- 6. iter1777 view-switcher Today title 維持 ---
  const board = readFileSync(resolve(here, '../src/components/workspace/items-board.tsx'), 'utf8')
  if (!board.includes('title="Today — 今日のタスク優先順、scheduledFor=今日 + 期限近接"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1777 view-switcher Today title が消えている',
    })
  }

  // --- 7. iter1718 mock-top-nav logout form brief aria-label 維持 ---
  if (!mockTopNav.includes('aria-label="ログアウト操作"')) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: 'iter1718 mock-top-nav logout form brief aria-label が消えている',
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
      '(なし) — home page + mock-top-nav logout button に title 付与で logout UX sighted ↔ SR 同期、iter1779-1732 invariant 不変',
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
