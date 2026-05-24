/**
 * Phase 6.15 loop iter1315 (mode-M = Mobile audit): iPhone SE 320px で
 * /sprints (SprintsPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (sprint-create-btn / sprint-defaults-edit-btn / sprint-period-edit /
 *     sprint-activate / sprint-complete / sprint-cancel / sprint-retro / sprint-premortem)
 *     bounding box ≥ 44x44
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-sprints-iter1315.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-sprints-iter1315',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // sprint 1 件 を seed (active status)
    const r = await admin.from('sprints').insert({
      workspace_id: workspaceId,
      name: 'モバイル audit 用 sprint',
      goal: 'iPhone SE 320px viewport 動作確認',
      status: 'active',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
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

    // 何が render してるか確認
    const cardCount = await page.locator('[data-testid^="sprint-card-"]').count()
    console.log(`[debug] sprint-card count=${cardCount}`)

    // 各 button の bounding box チェック
    const targets = [
      { sel: '[data-testid="sprint-create-btn"]' },
      { sel: '[data-testid^="sprint-defaults-edit"]' },
      { sel: '[data-testid^="sprint-period-edit-btn-"]' },
      { sel: '[data-testid^="sprint-complete-"]' },
      { sel: '[data-testid^="sprint-cancel-"]' },
      { sel: '[data-testid^="sprint-retro-"]' },
      { sel: '[data-testid^="sprint-premortem-"]' },
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
      path: '/tmp/uiux-mobile-sprints-iter1315.png',
      fullPage: true,
    })
  },
})
