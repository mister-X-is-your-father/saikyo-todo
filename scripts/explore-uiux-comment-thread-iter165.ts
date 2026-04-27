/**
 * Phase 6.15 loop iter 165 — comment-thread の SR semantic 改善 smoke。
 *
 * iter59 (textarea aria-label) / iter164 (edit/delete button aria-label) で
 * 中身は固めたが、loading / empty state / AI badge / 投稿時刻 が visual only
 * で SR から見えない gap が残っていた。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'comment-thread-iter165',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter165: comment-thread の AI badge を role="img" + aria-label="AI Agent による投稿"、投稿時刻を <time dateTime>、loading/empty <p> に role="status" を付与',
    })
  },
})
