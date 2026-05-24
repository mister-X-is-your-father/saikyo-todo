/**
 * Phase 6.15 loop iter1320 (mode-M = Mobile audit): iPhone SE 320px で
 * ItemEditDialog (item-edit-* buttons + tabs) を audit。
 *
 * 確認項目:
 *   - dialog 自体が viewport 内 (横 overflow なし)
 *   - tab trigger (tab-base / tab-summary / tab-subtasks / tab-dependencies / tab-comments /
 *     tab-activity) が tap target 44x44
 *   - footer save / cancel / archive / save-as-template / Template として保存 が tap target 44x44
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-item-edit-dialog-iter1320.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-item-edit-dialog-iter1320',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // Today/Inbox 用 item 1 件
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'モバイル audit 用 item',
      status: 'todo',
      priority: 3,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Backlog view に切替 (backlog-edit button から dialog 開きやすい)
    const backlogBtn = page.locator('[data-testid="view-backlog-btn"]').first()
    if ((await backlogBtn.count()) > 0) await backlogBtn.tap()
    await page.waitForTimeout(500)

    // Backlog の編集 button を tap して dialog 開く
    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'backlog-edit button not found (item seed が反映されてない)',
      })
      return
    }
    await editBtn.tap()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 横 overflow チェック (dialog 開いた状態)
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `dialog 開いた状態で documentElement.scrollWidth=${docW}px > viewport ${viewW}px`,
      })
    }

    // 各 button の bounding box チェック
    const targets = [
      { sel: '[data-testid="tab-base"]' },
      { sel: '[data-testid="tab-summary"]' },
      { sel: '[data-testid="tab-subtasks"]' },
      { sel: '[data-testid="tab-dependencies"]' },
      { sel: '[data-testid="tab-comments"]' },
      { sel: '[data-testid="tab-activity"]' },
      { sel: '[data-testid="item-edit-save"]' },
      { sel: '[data-testid="item-edit-cancel"]' },
      { sel: '[data-testid="item-edit-archive"]' },
      { sel: '[data-testid="item-edit-save-as-template"]' },
    ]
    for (const { sel } of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44 || w < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} < 44x44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-item-edit-dialog-iter1320.png',
      fullPage: true,
    })
  },
})
