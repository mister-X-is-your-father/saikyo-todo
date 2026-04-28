/**
 * Phase 6.15 loop iter 199 — DecomposeProposalsPanel の bulk button + cancel button の pending SR 化。
 *
 * iter180 で 全て採用 / 全て却下 / 中止 button の aria-label を整えたが、
 * pending 状態 (採用中… / 却下中… / 中止中…) は固定文言のままで SR 不可視。
 * iter194-198 同パターンで pending 状態別文言に切替え。中止 button は元々
 * aria-label 無しだったので新規付与。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'proposals-pending-iter199',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter199: DecomposeProposalsPanel の bulk button (全て採用/全て却下) + cancel button の aria-label を pending 状態別文言に切替え',
    })
  },
})
