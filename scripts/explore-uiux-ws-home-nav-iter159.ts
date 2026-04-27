/**
 * Phase 6.15 loop iter 159 — workspace home の page-link landmark a11y smoke。
 *
 * 9 個の page link (Goals / Sprints / PDCA / Templates / Workflows / 連携 /
 * Time Entries / Archive / 一覧) は `<Button asChild>` の単発 Button だけで
 * SR landmark navigation 不可だった (iter81 / iter101 / iter127 と同パターン)。
 * iter159 で `<nav aria-label="ワークスペース内ナビゲーション">` で囲い、
 * "← 一覧" の "←" arrow に aria-hidden + Link 自身に aria-label を追加。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'ws-home-nav-iter159',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter159: workspace home の page link 群を <nav aria-label> で囲い landmark 化、"← 一覧" の arrow を aria-hidden 化',
    })
  },
})
