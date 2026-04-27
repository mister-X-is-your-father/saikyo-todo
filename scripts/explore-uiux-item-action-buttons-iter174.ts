/**
 * Phase 6.15 loop iter 174 — ItemDecomposeButton / ItemResearchButton の SR 識別 smoke。
 *
 * Backlog action 列に並ぶ「AI 分解」「AI 調査」button が text のみで item title
 * を含む aria-label が無く、複数 item を SR で巡回するときに対象不明 (iter133 /
 * 144 同パターン)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'item-action-buttons-iter174',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter174: ItemDecomposeButton / ItemResearchButton に item title 含む aria-label を追加',
    })
  },
})
