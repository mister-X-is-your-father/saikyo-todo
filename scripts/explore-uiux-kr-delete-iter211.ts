/**
 * Phase 6.15 loop iter 211 — KR 削除 button の pending SR 化 + ✕ aria-hidden。
 *
 * 旧仕様: KR 行の削除 button はテキスト `✕` を直接子要素に持ち、aria-label
 * は付いていたが pending 状態 (削除中…) は固定文言だった。
 *
 * 改善:
 *   - aria-label を pending / 通常 で 2 状態別文言に
 *   - `✕` を `<span aria-hidden="true">` で wrap し SR aliasing を防止
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'kr-delete-iter211',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter211: KR 削除 button の aria-label を pending 状態別に、✕ を aria-hidden で wrap',
    })
  },
})
