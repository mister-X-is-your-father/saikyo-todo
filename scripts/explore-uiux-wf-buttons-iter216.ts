/**
 * Phase 6.15 loop iter 216 — Workflow 有効化/無効化 + 削除 + editor 保存 button の pending SR 化。
 *
 * iter180-215 同パターンを WorkflowCard / WorkflowEditorDialog の 3 button に展開:
 *   - 有効化/無効化 button: pending / 通常 で 2 状態別文言
 *   - 削除 button: pending / 通常 で 2 状態別文言
 *   - editor 保存 button: saving / 通常 で 2 状態別文言 + wf.name を含めた context
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'wf-buttons-iter216',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter216: WorkflowCard 有効化/無効化 + 削除 + editor 保存 button の aria-label を pending 状態別文言に',
    })
  },
})
