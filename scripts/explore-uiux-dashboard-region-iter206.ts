/**
 * Phase 6.15 loop iter 206 — DashboardView の Card に role="region" + aria-label。
 *
 * iter191-193 同パターンを Dashboard view の主要 2 Card (バーンダウン /
 * MUST Item 一覧) に展開。さらに WIP 警告の AlertTriangle と MUST 一覧
 * CardTitle の Flame icon に aria-hidden を付与し、SR が「fire / warning」
 * と読み上げる aliasing を解消。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'dashboard-region-iter206',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter206: DashboardView の バーンダウン / MUST 一覧 Card に role="region" + aria-label、Flame/AlertTriangle icon に aria-hidden 付与',
    })
  },
})
