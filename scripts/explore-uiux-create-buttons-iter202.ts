/**
 * Phase 6.15 loop iter 202 — Goal / KR / Sprint 新規作成 button の SR 化。
 *
 * iter194-201 同パターンを 3 つの作成 form に展開:
 *   - GoalsPanel: Goal「作成」 button (title 空 / pending / 通常)
 *   - GoalsPanel.KeyResultList: 「KR 追加」 button (krTitle 空 / pending / 通常)
 *   - SprintsPanel: Sprint「作成」 button (name 空 / pending / 通常)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'create-buttons-iter202',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter202: Goal「作成」 / KR「追加」 / Sprint「作成」 button の aria-label を空入力 disabled 理由 / pending / 通常 で 3 状態別文言に',
    })
  },
})
