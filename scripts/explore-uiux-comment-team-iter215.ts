/**
 * Phase 6.15 loop iter 215 — Comment 編集保存 / TeamContext 保存 button の SR 化。
 *
 * iter180-214 同パターン: 2 つの Save button (CommentItem 編集保存 / TeamContext
 * 保存) が空入力 disabled / pending 状態を持たず、SR は理由を聞き取れなかった。
 *
 *   - comment-thread save (編集モード): body 空 / pending / 通常 で 3 状態別文言
 *   - team-context save: !dirty / pending / 通常 で 3 状態別文言
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'comment-team-iter215',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter215: Comment 編集保存 + TeamContext 保存 button の aria-label を 3 状態別文言に切替え',
    })
  },
})
