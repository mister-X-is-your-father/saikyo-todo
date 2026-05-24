/**
 * Phase 6.15 loop iter1312 (mode-M = Mobile audit): iPhone SE 320px で
 * /workflows (WorkflowsPanel) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (`wf-run-` / `wf-edit-` / `wf-toggle-` / `wf-runs-toggle-` / `wf-delete-`)
 *     bounding box ≥ 44x44
 *   - 作成 form Input/Textarea が viewport 内
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-workflows-iter1312.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-workflows-iter1312',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // workflow 1 件 を seed
    const r = await admin.from('workflows').insert({
      workspace_id: workspaceId,
      name: 'モバイル audit 用 workflow',
      description: 'iPhone SE 320px viewport 動作確認',
      graph: { nodes: [], edges: [] },
      trigger: { kind: 'manual' },
      enabled: true,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
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

    // 各 button の bounding box チェック
    // 何が render してるか確認
    const created = await page.locator('[data-testid="wf-create-btn"]').count()
    const empty = await page.locator('[data-testid="workflows-empty-create"]').count()
    const list = await page.locator('[data-testid="workflows-list"]').count()
    console.log(
      `[debug] wf-create-btn=${created} workflows-empty-create=${empty} workflows-list=${list}`,
    )

    const targets = [
      { sel: '[data-testid="wf-create-btn"]' },
      { sel: '[data-testid="workflows-empty-create"]' },
      { sel: '[data-testid^="wf-run-"]' },
      { sel: '[data-testid^="wf-edit-"]' },
      { sel: '[data-testid^="wf-toggle-"]' },
      { sel: '[data-testid^="wf-runs-toggle-"]' },
      { sel: '[data-testid^="wf-delete-"]' },
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
      path: '/tmp/uiux-mobile-workflows-iter1312.png',
      fullPage: true,
    })
  },
})
