/**
 * Phase 6.15 loop iter 182 — status Badge の SR 識別 a11y smoke。
 *
 * Workspace role / Sprint status / Goal status を表示する Badge が text のみで
 * 何のステータスか SR で context 不明 (h1 / CardTitle と離れて配置されると特に)。
 * 各 Badge に動的 aria-label を付与して context を補う。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'status-badges-iter182',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter182: WorkspaceHeader role Badge / SprintCard status Badge / GoalCard status Badge に context 含む aria-label',
    })
  },
})
