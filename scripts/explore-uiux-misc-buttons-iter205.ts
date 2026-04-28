/**
 * Phase 6.15 loop iter 205 — NotificationBell 全て既読 / Item 依存追加 button の SR 化。
 *
 * iter194-204 同パターンを残り 2 button に展開:
 *   - notification-bell 全て既読 button: unreadCount=0 disabled / pending / 通常
 *   - item-dependencies-panel 追加 button: !pickId / pending / 通常
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'misc-buttons-iter205',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter205: NotificationBell 全て既読 + Item 依存追加 button の aria-label を状態別文言に',
    })
  },
})
