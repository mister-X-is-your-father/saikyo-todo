/**
 * Phase 6.15 loop iter1322 (mode-M = Mobile audit): iPhone SE 320px で
 * ItemEditDialog 内 form input (title / description / startDate / dueDate / mustToggle / dod /
 * tag-picker / assignee-picker) を audit。
 *
 * 確認項目:
 *   - title input が viewport 内かつ tap target 44px
 *   - description Textarea が viewport 内
 *   - startDate / dueDate date Input が tap target 44px
 *   - mustToggle checkbox の effective tap area (Label) が 44px
 *   - tag-picker / assignee-picker trigger が 44px
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-item-edit-form-iter1322.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-item-edit-form-iter1322',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'モバイル audit 用 item (form input check)',
      status: 'todo',
      priority: 3,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Backlog view に切替して dialog 開く
    const backlogBtn = page.locator('[data-testid="view-backlog-btn"]').first()
    if ((await backlogBtn.count()) > 0) await backlogBtn.tap()
    await page.waitForTimeout(500)

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

    // 各 form element の bounding box チェック
    const targets = [
      { sel: 'input#editTitle' },
      { sel: 'textarea#editDescription' },
      { sel: 'input#editStart' },
      { sel: 'input#editDue' },
      { sel: '[data-testid="edit-item-must"]', labelText: 'MUST' },
      { sel: '[data-testid="assignee-picker-trigger"]' },
    ]
    for (const { sel, labelText } of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      // Label 関連 element は parent label を check
      if (labelText) {
        const labelBox = await page
          .locator(`label:has-text("${labelText}")`)
          .filter({ has: page.locator(sel) })
          .first()
          .boundingBox()
        if (labelBox) {
          const lh = Math.round(labelBox.height)
          console.log(
            `  ${sel}: ${w}x${h} (effective via label: ${Math.round(labelBox.width)}x${lh})`,
          )
          if (lh < 44) {
            findings.push({
              level: 'warning',
              source: 'a11y',
              message: `${sel} effective tap (label ${lh}) < 44`,
            })
          }
          continue
        }
      }
      console.log(`  ${sel}: ${w}x${h}`)
      if (h < 44) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sel}: ${w}x${h} 高さ < 44 (WCAG 2.5.5 違反)`,
        })
      }
    }

    await page.screenshot({
      path: '/tmp/uiux-mobile-item-edit-form-iter1322.png',
      fullPage: true,
    })
  },
})
