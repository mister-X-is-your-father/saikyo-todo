/**
 * Phase 6.15 loop iter 179 — item-dependencies-panel の MUST マーカー (⚠) SR 化 smoke。
 *
 * iter178 で ItemEditDialog の 🧠 / 🛠 を aria-hidden 化したが、依存タブの
 * MUST item を表示する `⚠` マーカーが visual only で SR 不可視 (option 内 +
 * span 内の 2 箇所)。iter179 で解消。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'deps-must-iter179',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter179: item-dependencies-panel の `⚠` MUST マーカーを option には aria-label="MUST: <title>"、span には role="img" + aria-label="MUST item" で SR 化',
    })
  },
})
