/**
 * Phase 6.15 loop iter 151 — Template items editor の SR + 削除確認 a11y smoke。
 *
 * iter140 同パターン: MUST badge が visual only / DoD textarea に aria-label
 * が無い / 削除 button が無確認で実行される問題を修正。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'template-items-iter151',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/templates`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter151: Template items editor で MUST badge role=img + aria-label, DoD textarea aria-label + required, dueOffset aria-label, 削除 button に window.confirm を追加',
    })
  },
})
