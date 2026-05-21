/**
 * iter1030 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で WorkspaceModeSelector (作業モード選択 radio group) audit。
 *
 * 構造 (workspace-mode-selector.tsx line 124):
 *   `grid grid-cols-1 gap-2 sm:grid-cols-3`
 *   → mobile (<640px): 1 列に縦並び、tablet以上は 3 列
 *
 * 各 radio button が 44x44 tap target + viewport 内収まるか確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-mode-selector-iter1030',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    const ws = workspaceId
    // WorkspaceModeSelector は Goals page 上部に表示される (goals-panel.tsx line 126)
    await page.goto(`http://localhost:3001/${ws}/goals`, { waitUntil: 'networkidle' })
    const exists = await page.locator('[data-testid="workspace-mode-selector"]').count()
    if (exists === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: `workspace-mode-selector は home page 上に表示されていない (別 page か、表示条件あり)`,
      })
      await page.screenshot({
        path: '/tmp/uiux-mobile-mode-selector-iter1030-no-render.png',
        fullPage: true,
      })
      return
    }

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)

    const buttons = await page
      .locator('[data-testid="workspace-mode-selector"] button[role="radio"]')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            value: el.getAttribute('data-testid'),
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
          }
        }),
      )
    console.log(`[mode buttons] count=${buttons.length}`)
    for (const b of buttons) {
      console.log(`  ${b.value}: ${b.w}x${b.h}`)
      if (b.h < 44 || b.w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${b.value}: ${b.w}x${b.h} < 44x44`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-mode-selector-iter1030.png', fullPage: true })
  },
})
