/**
 * Phase 6.15 loop iter 124 — /<wsId>/integrations page (External source pull UI) smoke。
 * runner middleware (iter119) を使用、custom-rest source を seed して Pull button を試す。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter124-integrations',
  seed: async (admin, { workspaceId, userId }) => {
    // custom-rest source を 1 件 seed (URL は jsonplaceholder で fetch 成功させる)
    await admin.from('external_sources').insert({
      workspace_id: workspaceId,
      name: 'iter124 jsonplaceholder',
      kind: 'custom-rest',
      config: {
        url: 'https://jsonplaceholder.typicode.com/todos?_limit=2',
        idPath: 'id',
        titlePath: 'title',
      },
      enabled: true,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    page.on('dialog', (d) => void d.accept().catch(() => {}))

    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1000)

    // panel 描画
    const panel = await page.locator('[data-testid="integrations-panel"]').count()
    if (!panel) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'integrations-panel が描画されない',
      })
    }

    // 1 件 source が見える
    const cards = await page.locator('[data-testid^="src-card-"]').count()
    console.log(`[iter124] source cards: ${cards}`)
    if (cards !== 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `source card 1 件期待、実際 ${cards}`,
      })
    }

    // Pull button を押す (jsonplaceholder にネット fetch するため少し待つ)
    const pullBtn = page.locator('[data-testid^="src-pull-"]').first()
    await pullBtn.click()
    await page.waitForTimeout(5000)

    // 「Pull 成功」or 「Pull 失敗」 toast が表示
    const successToasts = await page.locator('text=Pull 成功').count()
    const failToasts = await page.locator('text=Pull 失敗').count()
    console.log(`[iter124] toasts: success=${successToasts} fail=${failToasts}`)
    if (successToasts === 0 && failToasts === 0) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'Pull 後 toast が出ていない',
      })
    }
  },
  exitOnFindings: false,
})
