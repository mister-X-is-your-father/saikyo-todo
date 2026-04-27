/**
 * Phase 6.15 loop iter 120 — Workflow card に履歴 (直近 5 件) disclosure を追加した動作検証。
 * runner middleware (iter119) を使用。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter120-workflow-runs',
  body: async ({ page, workspaceId, findings }) => {
    page.on('dialog', (d) => void d.accept().catch(() => {}))

    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)

    // 1. workflow を作成 (空 graph)
    await page.locator('input#wf-name').fill('iter120 wf-runs')
    await page.locator('[data-testid="wf-create-btn"]').click()
    await page.waitForTimeout(500)

    // 2. graph に noop node を 1 件入れて保存 (実行可能にする)
    await page.locator('[data-testid^="wf-edit-"]').first().click()
    await page.waitForTimeout(300)
    const graph = JSON.stringify(
      { nodes: [{ id: 'n1', type: 'noop', config: {} }], edges: [] },
      null,
      2,
    )
    await page.locator('[data-testid^="wf-editor-graph-"]').first().fill(graph)
    await page.locator('[data-testid^="wf-editor-save-"]').first().click()
    await page.waitForTimeout(800)

    // 3. 「実行」を 2 回押す
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-testid^="wf-run-"]').first().click()
      await page.waitForTimeout(800)
    }

    // 4. 履歴 toggle を開く
    const toggle = page.locator('[data-testid^="wf-runs-toggle-"]').first()
    await toggle.click()
    await page.waitForTimeout(500)

    const ariaExpanded = await toggle.getAttribute('aria-expanded')
    if (ariaExpanded !== 'true') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `履歴 toggle aria-expanded が true でない: ${ariaExpanded}`,
      })
    }

    // 5. 履歴 list が描画 + 2 件入っている
    const rows = await page.locator('[data-testid^="wf-run-row-"]').count()
    console.log(`[iter120] run history rows: ${rows}`)
    if (rows < 2) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `履歴 row が 2 件未満: ${rows}`,
      })
    }

    // 6. 各 row に「成功」badge が出ているか (1 件以上)
    const successCount = await page.locator('text=成功').count()
    console.log(`[iter120] success badge count: ${successCount}`)
    if (successCount < 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '成功 badge が描画されていない',
      })
    }
  },
  exitOnFindings: false,
})
