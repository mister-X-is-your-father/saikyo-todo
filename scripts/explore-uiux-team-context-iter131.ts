/**
 * Phase 6.15 loop iter 131 — workspace_settings.team_context 編集 UI smoke。
 * /goals 上部の TeamContextEditor で textarea に書いて保存 → reload で永続化を確認。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'team-context-iter131',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(1500)

    const editor = await page.locator('[data-testid="team-context-editor"]').count()
    console.log(`[iter131] editor rendered: ${editor}`)
    if (!editor) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: 'team-context-editor が描画されない',
      })
      return
    }

    // 既定は空 (workspace_settings 行が初期化された場合は別だが、create_workspace 既定は row 無し)
    const initial = await page.locator('[data-testid="team-context-textarea"]').inputValue()
    console.log(`[iter131] initial: ${JSON.stringify(initial)}`)

    // 保存
    await page
      .locator('[data-testid="team-context-textarea"]')
      .fill('チーム方針: iter131 TDD。Slack #team で進捗。')
    await page.locator('[data-testid="team-context-save-btn"]').click()
    await page.waitForTimeout(800)

    // reload で永続化確認
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const reloaded = await page.locator('[data-testid="team-context-textarea"]').inputValue()
    console.log(`[iter131] reloaded: ${JSON.stringify(reloaded)}`)
    if (reloaded !== 'チーム方針: iter131 TDD。Slack #team で進捗。') {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `team-context が永続化されていない (実際: ${reloaded})`,
      })
    }
  },
})
