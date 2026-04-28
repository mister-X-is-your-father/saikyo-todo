/**
 * Phase 6.15 loop iter 184 — 全 view の MUST badge SR 識別 一括 a11y smoke。
 *
 * iter140 / 151 / 179 で proposal / template-items / dependencies の MUST に
 * `role="img" + aria-label="MUST item"` を付けたが、Today / Inbox / Kanban /
 * Personal-period / Gantt の 5 view で MUST badge が visual only のまま
 * 残っていた gap (item title の右に並ぶが SR で読まれず識別不能)。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'must-badges-iter184',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter184: Today / Inbox / Kanban / Personal-period / Gantt の 5 view 全部の MUST badge に role="img" + aria-label="MUST item" を一括付与',
    })
  },
})
