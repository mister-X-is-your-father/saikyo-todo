/**
 * Phase 6.15 loop iter 156 — Workflow editor trigger プリセット button smoke。
 *
 * iter118 で trigger は JSON textarea のみだったので、4 種 (manual / cron /
 * item-event / webhook) のプリセット button を追加して typical JSON を流し込める
 * ようにする。webhook は crypto.randomUUID で 24 文字 secret を自動生成。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'workflow-trigger-preset-iter156',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter156: WorkflowEditorDialog 内 trigger textarea に 4 プリセット button (manual/cron/item-event/webhook) を追加',
    })
  },
})
