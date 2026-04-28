/**
 * Phase 6.15 loop iter 201 — Templates Panel / Items Editor / Instantiate Form の submit button SR 化。
 *
 * iter194-200 同パターンを Template 系 3 form に展開:
 *   - templates-panel: 「作成」 button (name 空 / pending / 通常)
 *   - template-items-editor: 「+ 追加」 button (title 空 / pending / 通常)
 *   - instantiate-form: 「即実行」 button (pending / 通常)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'template-buttons-iter201',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter201: Templates Panel / Items Editor / Instantiate Form の submit button の aria-label を状態別文言に切替え',
    })
  },
})
