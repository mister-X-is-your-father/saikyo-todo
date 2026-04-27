/**
 * Phase 6.15 loop iter 125 — /integrations 新規 Source 作成 form の smoke。
 * iter124 で作成 form 未実装だったところを実装したので、yamory / custom-rest 両方の
 * 作成パスを画面から触って source list に反映するところまで確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'source-create-iter125',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    const form = await page.locator('[data-testid="create-source-form"]').count()
    console.log(`[iter125] create form rendered: ${form}`)
    if (!form) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'create-source-form が描画されない',
      })
    }

    // 1. custom-rest 作成
    await page.locator('select#src-kind').selectOption('custom-rest')
    await page.locator('input#src-name').fill('iter125 custom rest')
    await page.locator('[data-testid="src-url"]').fill('https://jsonplaceholder.typicode.com/todos')
    await page.locator('input#src-id-path').fill('id')
    await page.locator('input#src-title-path').fill('title')
    await page.locator('[data-testid="src-create-btn"]').click()
    await page.waitForTimeout(1000)

    // 2. yamory 作成
    await page.locator('select#src-kind').selectOption('yamory')
    await page.locator('input#src-name').fill('iter125 yamory')
    await page.locator('[data-testid="src-token"]').fill('tok_iter125')
    await page.locator('[data-testid="src-create-btn"]').click()
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('[data-testid^="src-card-"]').count()
    console.log(`[iter125] source cards: ${cardCount}`)
    if (cardCount < 2) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `期待 2 件、実際 ${cardCount} 件 (作成 → list 反映が壊れている)`,
      })
    }
  },
})
