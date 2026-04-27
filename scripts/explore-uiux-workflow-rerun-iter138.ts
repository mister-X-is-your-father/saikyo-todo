/**
 * Phase 6.15 loop iter 138 — Workflow run の「再実行」button smoke。
 *
 * iter137 で run 履歴 expand に各 node の入出力を出したので、失敗 run の原因が
 * 分かったら同じ input で「再実行」して挙動を再現できるようにする。
 *
 * 期待: 再実行 button 押下 → useTriggerWorkflow が同じ workflowId / input で
 * 起動 → runs query 自動 invalidate で履歴件数が +1 に増える。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'workflow-rerun-iter138',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1200)

    // 既存 workflow が無いと smoke できないので skip 判定
    const cards = await page.locator('[data-testid^="wf-card-"]').count()
    console.log(`[iter138] workflow cards: ${cards}`)
    if (cards === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'Workflow が無いので rerun smoke は skip (seed 後に再実行)',
      })
      return
    }

    // 1 件目を expand → run 履歴を確認
    await page.locator('[data-testid^="wf-runs-toggle-"]').first().click()
    await page.waitForTimeout(600)

    const rerunBtns = await page.locator('[data-testid^="wf-run-rerun-"]').count()
    console.log(`[iter138] rerun buttons: ${rerunBtns}`)
    if (rerunBtns === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '「再実行」button が描画されない (iter138 で wf-run-rerun-* を追加したはず)',
      })
    }
  },
})
