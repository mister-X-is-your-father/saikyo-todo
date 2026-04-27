/**
 * Phase 6.15 loop iter 144 — Command palette タスク検索結果の priority + MUST a11y。
 *
 * 旧仕様: palette `?` モードの item 行は title のみ + MUST badge (visual only)。
 * Today/Inbox/Backlog は priority dot を出すが palette は出していなかった。
 * iter144 で priority dot (role=img + aria-label) と dueDate (有る時のみ)
 * を追加して、MUST badge にも aria-label を付与。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'palette-priority-iter144',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter144: palette item に priority dot (role=img + priorityLabel) / dueDate / MUST aria-label を追加',
    })
  },
})
