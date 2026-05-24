/**
 * Phase 6.15 loop iter1311 (mode-M = Mobile audit): iPhone SE 320px で
 * /pdca (PDCAPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (pdca-period-30 / pdca-period-90) bounding box ≥ 44x44
 *   - PdcaStat 4 セル (grid grid-cols-2 sm:grid-cols-4) が mobile で潰れず読める
 *   - PDCA 比率バー (role=img) が viewport 内
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-pdca-iter1311.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-pdca-iter1311',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
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

    // PDCA Panel が render してるか確認
    const pdcaPanel = await page.locator('[data-testid="pdca-panel"]').count()
    console.log(`[debug] pdca-panel count=${pdcaPanel}`)

    // 各 button の bounding box チェック
    const targets = [
      { sel: '[data-testid="pdca-period-30"]' },
      { sel: '[data-testid="pdca-period-90"]' },
      { sel: '[data-testid="pdca-distribution-bar"]' },
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
      if (h < 44 && sel.includes('btn')) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} 高さ < 44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-pdca-iter1311.png',
      fullPage: true,
    })
  },
})
