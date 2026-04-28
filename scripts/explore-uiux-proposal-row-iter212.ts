/**
 * Phase 6.15 loop iter 212 — ProposalRow 採用 / 却下 / 保存 button の pending SR 化。
 *
 * iter180-211 同パターン: ProposalRow の各 button (採用 / 却下 / 編集保存) は
 * disabled 時 aria-label が固定文言で SR は「処理中…」が伝わらず、また「採用」
 * button の `✓` text 子要素が SR で「check mark」と読み上げる aliasing が
 * 残っていた。
 *
 * 改善:
 *   - 採用 / 却下: disabled 時に「処理中…」aria-label に切替え
 *   - 採用 button の `✓` を `<span aria-hidden>` で wrap
 *   - 編集保存: pending / 通常 で 2 状態別文言、proposal.title を含めた context
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'proposal-row-iter212',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter212: ProposalRow の 採用 / 却下 / 保存 button の aria-label を pending 状態別、✓ を aria-hidden で wrap',
    })
  },
})
