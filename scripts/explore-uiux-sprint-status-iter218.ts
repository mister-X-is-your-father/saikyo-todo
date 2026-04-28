/**
 * Phase 6.15 loop iter 218 — Sprint ステータス変更 button (4 種) の pending SR 化。
 *
 * iter196 で 振り返り / Pre-mortem button、iter215-217 で他 pending button を
 * SR 化したが、Sprint ステータス変更 button (稼働開始 / 完了 / 計画に戻す /
 * 中止) は changing 中の固定 aria-label のままで SR は「変更中…」を聞き取れ
 * なかった。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'sprint-status-iter218',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter218: Sprint ステータス変更 4 button (稼働開始 / 完了 / 計画に戻す / 中止) の aria-label を pending 状態別文言に',
    })
  },
})
