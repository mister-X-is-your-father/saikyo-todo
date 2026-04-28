/**
 * Phase 6.15 loop iter 220 — Workflow rerun + Template 削除 button の pending SR 化。
 *
 * iter180-219 同パターンを残り 2 button に展開:
 *   - WorkflowRunHistory rerun button: trigger.isPending / 通常 + 行 ID context
 *   - TemplatesPanel Template 削除 button: deleteMut.isPending / 通常 + Template
 *     名 context、加えて Trash2 icon に aria-hidden を補完
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'rerun-template-iter220',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter220: Workflow rerun button + Template 削除 button の aria-label を pending 状態別文言に切替え',
    })
  },
})
