/**
 * Phase 6.15 loop iter1319 (mode-M = Mobile audit): iPhone SE 320px で
 * workspace ヘッダ (notification-bell / notification-preferences / theme-toggle 等) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - notification-bell / notification-preferences / theme-toggle bounding box ≥ 44x44
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-workspace-header-iter1319.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-workspace-header-iter1319',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
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

    // 各 button の bounding box チェック
    const targets = [
      { sel: '[data-testid="notification-bell"]' },
      { sel: '[data-testid="notification-preferences"]' },
      { sel: '[data-testid="theme-toggle"]' },
      { sel: '[data-testid="heartbeat-btn"]' },
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
      if (h < 44 || w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} < 44x44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-workspace-header-iter1319.png',
      fullPage: true,
    })
  },
})
