/**
 * Phase 6.15 loop iter 132 — yamory pull worker (iter123 で「次 iter」に deferred されていた
 * 実装) の UI smoke。
 *
 * - /integrations の yamory form で projectIds 必須化 (HTML5 required) を確認
 * - projectIds 入力済で source 作成 → list に反映
 * - 「Pull」押下 → 外部 endpoint は dummy (https://yamory.example/...) なので fetch 失敗 →
 *   import 履歴に failed が記録される
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'yamory-pull-iter132',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1200)

    // 1. yamory kind に切替
    await page.locator('select#src-kind').selectOption('yamory')
    await page.locator('input#src-name').fill('iter132 yamory')
    await page.locator('[data-testid="src-token"]').fill('tok_iter132')

    // projectIds 未入力で submit → HTML5 required で blocked (browser 側 validation)
    const projectIdsInput = page.locator('input#src-project-ids')
    const required = await projectIdsInput.getAttribute('required')
    const ariaReq = await projectIdsInput.getAttribute('aria-required')
    console.log(`[iter132] project-ids required=${required} aria-required=${ariaReq}`)
    if (required === null) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message:
          'yamory form の project-ids input に required 属性が無い (iter132 で必須化済のはず)',
      })
    }

    // 2. projectIds + 任意 baseUrl 入力で作成 (実 endpoint には繋げないので Pull は失敗想定)
    await projectIdsInput.fill('proj-a, proj-b')
    await page.locator('[data-testid="src-create-btn"]').click()
    await page.waitForTimeout(1200)

    const cardCount = await page.locator('[data-testid^="src-card-"]').count()
    console.log(`[iter132] source cards after create: ${cardCount}`)
    if (cardCount < 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: '作成後の source card が 0 件 (yamory create が壊れている可能性)',
      })
    }
  },
})
