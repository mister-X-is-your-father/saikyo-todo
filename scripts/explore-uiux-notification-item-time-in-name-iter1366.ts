/**
 * playwright-iter1366 (mode-D fix verify): NotificationBell popover の通知行 button は
 * `aria-label` で subtree を name するため、内側 `<time>` の相対時刻 (例「たった今」) が
 * SR に一切届かず、受信時刻が視覚のみの情報になっていた (WCAG 1.3.1)。
 *
 * 修正 (notification-bell.tsx): button の accessible name 末尾に `formatRelativeTime` を
 * 追加。本 script は通知を seed → popover を開く → 通知 button の accessible name に
 * 相対時刻が含まれることを assert する。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-notification-item-time-in-name-iter1366.ts
 */
import { runExplore } from './lib/explore-uiux-runner'

void runExplore({
  name: 'notification-item-time-in-name-iter1366',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: true,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('notifications').insert({
      workspace_id: workspaceId,
      user_id: userId,
      type: 'heartbeat',
      payload: { stage: '3d', dueDate: '2026-06-01', daysUntilDue: 3, itemId: null },
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    await page.locator('[data-testid="notification-bell"]').click()
    await page.waitForSelector('[data-testid="notification-item"]', { timeout: 5000 })
    await page.waitForTimeout(300)

    const btn = page.locator('[data-testid="notification-item"]').first()
    const ariaLabel = (await btn.getAttribute('aria-label')) ?? ''
    // <time> の visible 相対時刻文字列を取得し、button name に含まれることを確認
    const relText = (await btn.locator('time span[aria-hidden="true"]').textContent())?.trim() ?? ''
    console.log(`[aria-label] ${ariaLabel}`)
    console.log(`[relative-time] ${relText}`)

    if (!relText) {
      findings.push({
        level: 'error',
        source: 'observation',
        message: 'time visible text が空 — seed/render 失敗',
      })
    } else if (!ariaLabel.includes(relText)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `通知 button の accessible name に相対時刻「${relText}」が含まれない (受信時刻が SR 不可視)`,
      })
    }
  },
})
