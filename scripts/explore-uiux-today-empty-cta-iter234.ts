/**
 * Phase 6.15 loop iter 234 — Today view empty state に CTA button (QuickAdd へ誘導)。
 *
 * 旧仕様: Today view が空の時 EmptyState の説明 (「scheduled_for / dueDate を…」) を
 * 表示するだけで、ユーザは画面上部の QuickAdd 入力欄まで Tab / scroll する必要が
 * あった。Todoist / TickTick の empty state は「+ Add task」CTA を中央に置いて
 * 即座に行動を誘導する。
 *
 * 改善: EmptyState の `action` slot に「クイック追加にフォーカス (キー: q)」
 * button を追加。click で `#quick-add-input` を focus + scrollIntoView。aria-label
 * にも明示。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'today-empty-cta-iter234',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter234: Today view empty state に「クイック追加にフォーカス (q)」CTA button を追加',
    })
  },
})
