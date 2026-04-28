/**
 * Phase 6.15 loop iter 204 — 子タスク bulk / Sprint デフォルト / Personal-period ゴール 保存 button の SR 化。
 *
 * iter194-203 同パターン:
 *   - subtasks-bulk-add: 件数を含む文言。空入力 / pending / 通常
 *   - sprint-defaults-save: pending / 通常
 *   - period-goal-save: !dirty (変更なし) / pending / 通常 (3 状態)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'save-buttons-iter204',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter204: 子タスク bulk追加 / Sprint デフォルト保存 / Personal-period ゴール保存 button の aria-label を状態別文言に',
    })
  },
})
