/**
 * Phase 6.15 loop iter 168 — workflow run history / node runs の loading /
 * error / empty state SR semantic smoke。
 *
 * iter137-138 で history / rerun / node runs viewer を実装したが loading /
 * empty / error の `<p>` に role 無しで SR から状態が見えない gap (iter161
 * async-states 同パターンを workflow 周りにも展開)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'workflow-states-iter168',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/workflows`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter168: WorkflowRunHistory / WorkflowNodeRunsList の loading=role="status"+aria-live="polite"、error=role="alert"、empty=role="status" を追加',
    })
  },
})
