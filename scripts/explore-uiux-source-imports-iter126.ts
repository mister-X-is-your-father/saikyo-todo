/**
 * Phase 6.15 loop iter 126 — Source card に直近 5 件の Pull 履歴 disclosure を追加した動作検証。
 * runner middleware (iter119) を使用。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'iter126-source-imports',
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('external_sources').insert({
      workspace_id: workspaceId,
      name: 'iter126 src',
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

    // Pull を 2 回押す (直近の history を作る)
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-testid^="src-pull-"]').first().click()
      await page.waitForTimeout(4000)
    }

    // 履歴 toggle を開く
    const toggle = page.locator('[data-testid^="src-imports-toggle-"]').first()
    await toggle.click()
    await page.waitForTimeout(500)
    const expanded = await toggle.getAttribute('aria-expanded')
    if (expanded !== 'true') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `aria-expanded true 期待、実際 ${expanded}`,
      })
    }

    const rows = await page.locator('[data-testid^="src-import-row-"]').count()
    console.log(`[iter126] import history rows: ${rows}`)
    if (rows < 2) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `履歴 row 2 件未満: ${rows}`,
      })
    }

    const successBadges = await page.locator('text=成功').count()
    console.log(`[iter126] success badges: ${successBadges}`)
    if (successBadges < 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '成功 badge 出ない',
      })
    }
  },
  exitOnFindings: false,
})
