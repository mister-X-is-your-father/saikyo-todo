/**
 * iter1026 (playwright loop, mode-M = Mobile audit):
 * iPhone SE 320px で NotificationBell popover (右上 bell icon click で開く Radix Popover)
 * の overflow / readability audit。
 *
 * 構造 (notification-bell.tsx line 149-152):
 *   <PopoverContent
 *     align="end"
 *     className="w-80 max-w-[calc(100vw-1rem)] gap-0 p-0"
 *     aria-labelledby="notification-bell-heading"
 *   >
 *
 * `w-80` = 320px width、`max-w-[calc(100vw-1rem)]` で右 8px margin を引いた viewport
 * 内に収める。iter1024/1025 fixed panel と異なり Popover は Radix が自動配置するが、
 * mobile で実際 viewport 内収まるか確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-notif-popover-iter1026',
  device: 'iPhone SE',
  isMobile: true,
  body: async ({ page, workspaceId, findings }) => {
    const ws = workspaceId
    await page.goto(`http://localhost:3001/${ws}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="notification-bell"]', { timeout: 10_000 })

    // bell click で popover 開く
    await page.click('[data-testid="notification-bell"]')
    await page.waitForSelector('[aria-labelledby="notification-bell-heading"]', { timeout: 5_000 })

    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)

    const popMetrics = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-labelledby="notification-bell-heading"]',
      ) as HTMLElement | null
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
      }
    })
    console.log(`[popover] ${JSON.stringify(popMetrics)}`)
    if (popMetrics) {
      if (popMetrics.left < 0) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `popover.left=${popMetrics.left}px (viewport 左端を超えている)`,
        })
      }
      if (popMetrics.right > viewW + 4) {
        findings.push({
          level: 'warning',
          source: 'observation',
          message: `popover.right=${popMetrics.right}px > viewport ${viewW}px (overflow)`,
        })
      }
    }

    // 「全て既読」 button + bell button自身 44x44 satisfy
    const buttons = await page
      .locator('[data-testid="notification-bell"], [data-testid="notification-mark-all-read"]')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return {
            testid: el.getAttribute('data-testid') ?? '',
            w: Math.round(r.width),
            h: Math.round(r.height),
          }
        }),
      )
    // WCAG 2.5.5 44x44 を厳密に確認。1px sub-pixel rounding は許容。
    for (const b of buttons) {
      console.log(`  ${b.testid}: ${b.w}x${b.h}`)
      if (b.h < 43 || b.w < 43) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${b.testid}: ${b.w}x${b.h} < 44x44 (tap target 不足、1px tolerance あり)`,
        })
      }
    }

    await page.screenshot({ path: '/tmp/uiux-mobile-notif-popover-iter1026.png', fullPage: true })
  },
})
