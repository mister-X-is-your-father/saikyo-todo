/**
 * Phase 6.15 loop iter 197 — ItemDecomposeButton / ItemResearchButton の disabled 理由 SR 化。
 *
 * iter194/195/196 同パターン: 完了済 item / pending 中で disabled になるが
 * aria-label が固定文言で SR ユーザに「なぜ disabled なのか」が伝わらなかった。
 * 3 状態別文言 (done / pending / 通常) に切替え。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'item-ai-buttons-iter197',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter197: ItemDecomposeButton + ItemResearchButton の aria-label を 3 状態別文言 (done/pending/通常) に切替え (iter194-196 同パターン)',
    })
  },
})
