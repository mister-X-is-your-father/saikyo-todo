/**
 * Phase 6.15 loop iter 223 — TimeEntries Sync + Create + QuickAdd 作成 button の SR 化。
 *
 * iter180-222 同パターンを残り 3 button に展開:
 *   - time-entries-table Sync button: pending / 通常 + 再 Sync 区別
 *   - create-time-entry-form 記録 button: pending / 通常
 *   - quick-add 作成 button: !preview.title / pending / 通常
 *     (preview.title を含む dynamic context)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'time-quick-iter223',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter223: TimeEntries Sync + Create + QuickAdd 作成 button の aria-label を pending 状態別文言に',
    })
  },
})
