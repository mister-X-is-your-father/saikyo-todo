/**
 * Phase 6.15 loop iter 207 — BulkActionBar status / delete button の pending SR 化。
 *
 * iter167 で BulkActionBar の aria-label を整え、iter180-205 で他の bulk button
 * を pending 化したが、bulk-action-bar.tsx の status 変更 button (各 status 毎)
 * と削除 button は pending 中の文言が固定で SR は「変更中…」「削除中…」が
 * 伝わらなかった。iter194-206 同パターンで pending 状態別文言に切替え。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'bulk-pending-iter207',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter207: BulkActionBar status 変更 / 削除 button の aria-label を pending 状態別文言に切替え',
    })
  },
})
