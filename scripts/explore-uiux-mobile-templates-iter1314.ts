/**
 * Phase 6.15 loop iter1314 (mode-M = Mobile audit): iPhone SE 320px で
 * /templates (TemplatesPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (template card title disclosure / template delete / tmpl-create-btn /
 *     tmpl-name input / tmpl-desc textarea) bounding box ≥ 44x44
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-templates-iter1314.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-templates-iter1314',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // template 1 件 を seed
    const r = await admin.from('templates').insert({
      workspace_id: workspaceId,
      name: 'モバイル audit 用 template',
      description: 'iPhone SE 320px 動作確認',
      kind: 'manual',
      created_by: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/templates`, { waitUntil: 'networkidle' })
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

    // 何が render してるか
    const created = await page.locator('[data-testid="tmpl-create-btn"]').count()
    const cardCount = await page.locator('[data-testid^="template-card-"]').count()
    console.log(`[debug] tmpl-create-btn=${created} template-card count=${cardCount}`)

    // 各 button の bounding box チェック
    const targets = [
      { sel: '#tmpl-name' },
      { sel: '[data-testid^="template-card-"]' },
      { sel: 'button[aria-label^="作成"]' },
      { sel: 'button[aria-label^="削除"]' },
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
      path: '/tmp/uiux-mobile-templates-iter1314.png',
      fullPage: true,
    })
  },
})
