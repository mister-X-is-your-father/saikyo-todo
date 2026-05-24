/**
 * Phase 6.15 loop iter1324 (mode-M = Mobile audit): iPhone SE 320px で
 * /time-entries (TimeEntriesPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - create-time-entry-form input + submit button が tap target 44px
 *   - time-entries-table 内 sync button が tap target 44px
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-time-entries-iter1324.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-time-entries-iter1324',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/time-entries`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(500)

    // 横 overflow チェック
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横 overflow)`,
      })
    }

    // 何が render してるか
    const formCount = await page.locator('[data-testid="create-time-entry-form"]').count()
    const tableCount = await page.locator('[data-testid="time-entries-table"]').count()
    console.log(`[debug] create-time-entry-form=${formCount} time-entries-table=${tableCount}`)

    // 各 element の bounding box チェック
    const targets = [
      { sel: '#teDate' },
      { sel: '#teHours' },
      { sel: '[data-testid="create-time-entry-submit"]' },
      { sel: '[data-testid^="time-entry-sync-"]' },
    ]
    for (const { sel } of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} 高さ < 44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-time-entries-iter1324.png',
      fullPage: true,
    })
  },
})
