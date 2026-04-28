/**
 * Phase 6.15 loop iter 203 — Workflow / Source / Comment 投稿 button の SR 化。
 *
 * iter202 同パターンを残り 3 form の create button に展開:
 *   - WorkflowsPanel: Workflow「作成」 button
 *   - IntegrationsPanel: Source「作成」 button
 *   - CommentThread: コメント「投稿」 button
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'create-buttons2-iter203',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter203: Workflow / Source / Comment 投稿 button の aria-label を空入力 disabled / pending / 通常 で 3 状態別文言に',
    })
  },
})
