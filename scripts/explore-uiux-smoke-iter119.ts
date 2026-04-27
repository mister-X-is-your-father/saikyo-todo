/**
 * Phase 6.15 loop iter 119 — Playwright runner middleware (HOF) パターンの導入。
 * 既存 explore-uiux スクリプトの try/finally / close 漏れリスクを排除するために
 * `scripts/lib/explore-uiux-runner.ts` を投入。本 iter ではそれを使った smoke を 1 つ書く。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter119-smoke',
  body: async ({ page, workspaceId, findings }) => {
    // Workflows page を開いて panel が描画されるまで確認
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)

    const panel = await page.locator('[data-testid="workflows-panel"]').count()
    if (!panel) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'workflows panel が描画されない',
      })
    }

    // 簡単に作成 + 削除 (削除 confirm を auto-accept)
    page.on('dialog', (d) => void d.accept().catch(() => {}))
    await page.locator('input#wf-name').fill('iter119 smoke wf')
    await page.locator('[data-testid="wf-create-btn"]').click()
    await page.waitForTimeout(500)
    const cards = await page.locator('[data-testid^="wf-card-"]').count()
    if (cards !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `card 1 件期待だが ${cards} 件`,
      })
    }
  },
})
