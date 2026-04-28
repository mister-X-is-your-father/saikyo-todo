/**
 * Phase 6.15 loop iter 185 — BudgetPanel の月次コストバー a11y。
 *
 * goals-panel / sprints-panel の進捗バーには role="progressbar" + aria-valuenow が
 * 既に付いていたが、budget-panel.tsx の月次 AI コスト消費率バーは role 無しで
 * SR が「数値を読み上げない」状態だった (visual only)。さらに警告閾値ライン
 * (1px 縦線) には個別 aria-label が付いていたが、SR で 2 個読み上げられて
 * 冗長 → 親バー側 aria-label に統合し、子要素は aria-hidden="true"。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'budget-progress-iter185',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter185: BudgetPanel の月次 AI コスト消費率バーに role="progressbar" + aria-valuenow + aria-label を付与。閾値ラインは aria-hidden で SR 冗長を解消',
    })
  },
})
