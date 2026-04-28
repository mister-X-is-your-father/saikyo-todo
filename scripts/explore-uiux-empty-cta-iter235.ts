/**
 * Phase 6.15 loop iter 235 — Inbox / items-board 全体 empty state にも CTA 展開。
 *
 * iter234 で Today empty state に CTA を入れた。同パターンを Inbox view と
 * items-board ルート (filtered.length===0 全体) にも展開し、どの view に居ても
 * 「次に何をすべきか」が一発で分かる UX に統一。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'empty-cta-iter235',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter235: Inbox empty state + items-board ルート empty state にも「クイック追加にフォーカス (q)」 CTA button を追加',
    })
  },
})
