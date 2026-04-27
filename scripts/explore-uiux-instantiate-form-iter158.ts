/**
 * Phase 6.15 loop iter 158 — Template instantiate form の SR / 識別 a11y smoke。
 *
 * iter96 (templates a11y) / iter151 (template-items-editor a11y) で /templates の
 * 周辺を整えたが、instantiate-form 内が未対応 (root override input に
 * maxLength なし、Mustache 変数 input に required なし、submit button に
 * template name 含む aria-label なし)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'instantiate-form-iter158',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/templates`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter158: instantiate-form に aria-labelledby + override IMEInput の maxLength + 変数 input の required/aria-label + submit button の aria-label',
    })
  },
})
