/**
 * Phase 6.15 loop iter1313 (mode-M = Mobile audit): iPhone SE 320px で
 * /integrations (IntegrationsPanel - External Source 一覧) を audit。
 *
 * 確認項目:
 *   - documentElement.scrollWidth ≤ viewport (横 overflow なし)
 *   - 主要 button (`src-pull-` / `src-toggle-` / `src-imports-toggle-` / `src-delete-` /
 *     `src-create-btn` / `src-create-form-focus`) bounding box ≥ 44x44
 *
 * 探索のみ (修正なし)。findings が出たら次 iter で個別 fix。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-mobile-integrations-iter1313.ts
 * 前提: pnpm dev (localhost:3001) + supabase local 起動済
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'mobile-integrations-iter1313',
  device: 'iPhone SE',
  isMobile: true,
  async seed(admin, { workspaceId, userId }) {
    // External Source 1 件 を seed
    const r = await admin.from('external_sources').insert({
      workspace_id: workspaceId,
      name: 'モバイル audit 用 source',
      kind: 'yamory',
      enabled: true,
      config: {},
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/integrations`, {
      waitUntil: 'networkidle',
    })
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
    const created = await page.locator('[data-testid="src-create-btn"]').count()
    const rowCount = await page.locator('[data-testid^="src-card-"]').count()
    console.log(`[debug] src-create-btn=${created} src-card count=${rowCount}`)

    // 各 button の bounding box チェック
    const targets = [
      { sel: '[data-testid="src-create-btn"]' },
      { sel: '[data-testid^="src-pull-"]' },
      { sel: '[data-testid^="src-toggle-"]' },
      { sel: '[data-testid^="src-imports-toggle-"]' },
      { sel: '[data-testid^="src-delete-"]' },
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
      path: '/tmp/uiux-mobile-integrations-iter1313.png',
      fullPage: true,
    })
  },
})
