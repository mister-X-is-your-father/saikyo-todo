/**
 * Phase 6.15 loop iter 237 — Templates / Integrations / TimeEntries EmptyState にも CTA 展開。
 *
 * iter234-236 同パターンを残り 3 panel の empty state に展開:
 *   - templates-panel: focus #tmpl-name
 *   - integrations-panel: focus #src-name
 *   - time-entries-panel: focus #teDate
 *
 * これで主要 8 view の empty state がすべて「作成フォームへ」 CTA を持ち、
 * Tab / scroll の自力移動が不要になる。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'empty-cta-3-iter237',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter237: Templates / Integrations / TimeEntries の EmptyState に「作成フォームへ」 CTA button を追加',
    })
  },
})
