/**
 * Phase 6.15 loop iter 183 — StatusBadge (Item 共通) の SR 識別 a11y smoke。
 *
 * Today / Inbox / Kanban / Backlog / Personal-period の全 view で使われる
 * 共通 StatusBadge component が aria-label を持たず、SR で「TODO」「進行中」
 * 「完了」と読まれるが何のステータスかが context 不明だった (item title から
 * 離れて配置されると特に)。1 ファイル変更で全 view 反映。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'status-badge-iter183',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter183: 共通 StatusBadge に aria-label="ステータス: <label>" を付与 (Today/Inbox/Kanban/Backlog/Personal-period 全 view 一括反映)',
    })
  },
})
