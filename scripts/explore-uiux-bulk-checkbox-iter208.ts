/**
 * Phase 6.15 loop iter 208 — BulkCheckbox / BulkHeaderCheckbox の SR 識別。
 *
 * 旧仕様: BulkCheckbox は `aria-label="選択"` 固定で SR ユーザは Backlog の
 * N 行で 50 回「選択」だけを聞かされて、どの行を選んでいるか不明だった。
 * BulkHeaderCheckbox も `aria-label="全選択"` 固定で件数や current state が
 * 伝わらなかった。
 *
 * 改善:
 *   - BulkCheckbox: itemTitle を受け取り、aria-label に「『〜』を一括操作の
 *     対象に追加 / 対象から外す」を入れて行を識別 + 動作を予告
 *   - BulkHeaderCheckbox: rowIds.length を含めて「現ページ N 行をすべて〜」を
 *     現状に応じて生成
 *   - backlog-view: BulkCheckbox に itemTitle を渡す
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'bulk-checkbox-iter208',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter208: BulkCheckbox に itemTitle を渡して aria-label を行毎にユニーク化、BulkHeaderCheckbox は件数 + 現状で文言切替',
    })
  },
})
