/**
 * Phase 6.15 loop iter 219 — Goal ステータス変更 5 button (完了 / アーカイブ × 2 / active に戻す × 2) の pending SR 化。
 *
 * iter218 で Sprint 4 button を SR 化、iter195 で Goal AI 分解 button を SR 化したが、
 * Goal ステータス変更 button (completed / archived / active 各遷移) は固定
 * aria-label のままで pending 中の context が SR に伝わらなかった。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'goal-status-iter219',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter219: Goal ステータス変更 5 button の aria-label を pending 状態別文言に切替え (iter218 同パターン)',
    })
  },
})
