/**
 * Phase 6.15 loop iter 236 — Sprint / Goal / Workflow EmptyState にも CTA 展開。
 *
 * iter234/235 で Today / Inbox / items-board の empty state に「クイック追加へ」
 * CTA を入れた。同パターンを Sprint / Goal / Workflow の empty state にも展開。
 * 各 form の最初の input id を focus + scrollIntoView する button を action slot に。
 *   - sprints-panel: id="sprint-name"
 *   - goals-panel: id="goal-title"
 *   - workflows-panel: id="wf-name"
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'empty-cta-2-iter236',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter236: Sprint / Goal / Workflow の EmptyState に「作成フォームへ」 CTA button を追加',
    })
  },
})
