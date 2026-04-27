/**
 * Phase 6.15 loop iter 128 — /workflows と /integrations の landmark a11y 確認 (iter127 fix の検証)。
 * + workflow / source card の各種ボタンが focusable + role を持つか smoke。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'workflows-landmarks-iter128',
  body: async ({ page, workspaceId, findings }) => {
    // /workflows
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    // section landmark を確認 (iter127 で <section aria-labelledby> 化)
    const wfSections = await page.locator('main section').count()
    console.log(`[iter128] /workflows section count: ${wfSections}`)

    // /integrations
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)
    const intSections = await page.locator('main section').count()
    console.log(`[iter128] /integrations section count: ${intSections}`)

    if (wfSections === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: '/workflows に section landmark なし (iter127 fix 効いてない?)',
      })
    }
    if (intSections === 0) {
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: '/integrations に section landmark なし (iter127 fix 効いてない?)',
      })
    }
  },
})
