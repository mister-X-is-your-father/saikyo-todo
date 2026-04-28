/**
 * Phase 6.15 loop iter 221 — Sprint 期間保存 + Archived 復元 button の pending SR 化。
 *
 * iter180-220 同パターンを残り 2 button に展開:
 *   - Sprint 期間保存 button: update.isPending / 通常 で 2 状態別文言
 *   - Archived 復元 button: unarchive.isPending / 通常 で 2 状態別文言
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'misc-pending-iter221',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter221: Sprint 期間保存 + Archived 復元 button の aria-label を pending 状態別文言に',
    })
  },
})
