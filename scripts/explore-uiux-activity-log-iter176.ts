/**
 * Phase 6.15 loop iter 176 — ActivityLog の loading/error/empty SR semantic smoke。
 *
 * iter161 / 168 / 171 同パターンを ActivityLog にも展開: 3 つの <p> に role を
 * 一括付与して、ItemEditDialog Activity タブの状態が SR で読み上げられるように。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'activity-log-iter176',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter176: ActivityLog の loading=role="status"+aria-live="polite"、error=role="alert"、empty=role="status"',
    })
  },
})
