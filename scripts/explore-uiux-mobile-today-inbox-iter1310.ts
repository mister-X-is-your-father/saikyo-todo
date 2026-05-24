/**
 * Phase 6.15 loop iter1310 (mode-M = Mobile audit): iPhone SE 320px で
 * Today + Inbox view を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (`today-row-` / `inbox-row-` / `view-*-btn` / `item-checkbox-`) の bounding box ≥ 44x44
 *   - quick-add input + submit button が viewport 内
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-today-inbox-iter1310.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-today-inbox-iter1310',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // Inbox 用 item (scheduledFor も dueDate も無し) を 2 件
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: 'モバイル audit 用 Inbox item 1',
        status: 'todo',
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: 'モバイル audit 用 Inbox item 2 (長めの title で width 確認 12345678901234567890)',
        status: 'todo',
        priority: 1,
        is_must: true,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 横 overflow チェック
    const docW = await page.evaluate(() => document.documentElement.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    console.log(`[viewport] doc.scrollWidth=${docW} window.innerWidth=${viewW}`)
    if (docW > viewW + 1) {
      findings.push({
        level: 'warning',
        source: 'observation',
        message: `documentElement.scrollWidth=${docW}px > viewport ${viewW}px (横 overflow)`,
      })
    }

    // Inbox view に切替
    const inboxBtn = page.locator('[data-testid="view-inbox-btn"]').first()
    if ((await inboxBtn.count()) > 0) await inboxBtn.tap()
    await page.waitForTimeout(400)

    // 各 button の bounding box チェック
    // 注: input[type=checkbox] は htmlFor Label が visible + min-h-11 を持つ場合は
    //     Label 全体が tap area で WCAG 2.5.5 satisfy (input 自体は 13x13 でも OK)。
    //     ↓ targets には input 自体 + Label parent の 両方を入れて、Label OK なら skip。
    const targets = [
      { sel: '[data-testid="view-today-btn"]' },
      { sel: '[data-testid="view-inbox-btn"]' },
      { sel: '[data-testid="view-kanban-btn"]' },
      { sel: '[data-testid="quick-add-input"]' },
      { sel: '[data-testid="quick-add-submit"]' },
      { sel: '[data-testid^="inbox-row-"]' },
      { sel: '[data-testid^="item-checkbox-"]' },
      { sel: '[data-testid="filter-must"]', labelFor: 'filter-must' },
      { sel: '[data-testid="filter-status"]' },
    ]
    for (const { sel, labelFor } of targets) {
      const loc = page.locator(sel).first()
      if ((await loc.count()) === 0) {
        console.log(`  ${sel}: not found`)
        continue
      }
      const box = await loc.boundingBox()
      if (!box) continue
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      // Label がある場合は Label の box を effective tap area として check
      if (labelFor) {
        const labelBox = await page.locator(`label[for="${labelFor}"]`).first().boundingBox()
        if (labelBox) {
          const lw = Math.round(labelBox.width)
          const lh = Math.round(labelBox.height)
          console.log(`  ${sel}: ${w}x${h} (effective via label[for=${labelFor}]: ${lw}x${lh})`)
          if (lh < 44) {
            findings.push({
              level: 'warning',
              source: 'a11y',
              message: `${sel} effective tap (label[for=${labelFor}]) ${lw}x${lh}: 高さ < 44 (WCAG 2.5.5 違反)`,
            })
          }
          continue
        }
      }
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
      path: '/tmp/uiux-mobile-today-inbox-iter1310.png',
      fullPage: true,
    })
  },
})
