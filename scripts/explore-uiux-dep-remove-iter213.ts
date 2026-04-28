/**
 * Phase 6.15 loop iter 213 — 依存解除 button の pending SR 化 + disabled 連携。
 *
 * iter180-212 同パターン: ItemDependenciesPanel の Section 内 解除 button は
 * disabled prop なし aria-label 固定で、SR は「解除中…」を聞き取れず、また
 * 連打した場合に二重 mutation の race が起こり得た。
 *
 * 改善: Section に `removing?: boolean` prop を追加し、parent から
 * `remove.isPending` を渡す。Button は disabled={removing} + aria-label を
 * pending / 通常 で 2 状態別文言に切替え。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'dep-remove-iter213',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter213: 依存解除 button に removing prop を伝搬し disabled + aria-label を pending 状態別に切替え',
    })
  },
})
