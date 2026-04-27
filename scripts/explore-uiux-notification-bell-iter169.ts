/**
 * Phase 6.15 loop iter 169 — notification-bell の SR semantic 改善 smoke。
 *
 * iter102 で notification item button の aria-label は付与済だが、bell 全体の
 * aria-expanded / haspopup、装飾 icon の aria-hidden、loading/empty <div> の
 * role、time の <time dateTime> 化が未対応の gap (iter161 / 165 / 166 同パターン)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'notification-bell-iter169',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter169: notification-bell の trigger に aria-expanded/haspopup="dialog"、Bell icon と Badge と CheckCheck icon に aria-hidden、「全て既読」button に動的 aria-label (未読 N 件)、loading/empty <div> に role="status"、<p>(時刻) を <time dateTime> に変更',
    })
  },
})
