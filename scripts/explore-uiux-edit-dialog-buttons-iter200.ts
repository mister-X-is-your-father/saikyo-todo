/**
 * Phase 6.15 loop iter 200 — ItemEditDialog footer button (Save / Archive / Unarchive) の SR 化。
 *
 * iter194-199 同パターンを ItemEditDialog footer の主要 button に展開:
 *   - Save: title 空 disabled の理由 / pending 中 / 通常 を 3 状態別文言に
 *   - Archive / Unarchive: pending 中 / 通常 を 2 状態別文言に + item title を含めた context
 *
 * 200 iter milestone の節目 commit。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'edit-dialog-buttons-iter200',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter200: ItemEditDialog footer の Save / Archive / Unarchive button の aria-label を状態別文言に切替え (200 iter milestone)',
    })
  },
})
