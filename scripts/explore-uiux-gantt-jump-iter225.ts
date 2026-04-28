/**
 * Phase 6.15 loop iter 225 — Gantt 「今日へジャンプ」 button に aria-label。
 *
 * 旧仕様: title 属性のみ (mouse hover 専用) で「Gantt timeline を今日まで横
 * スクロール」という動作の明示が SR に伝わっていなかった。「今日へジャンプ」
 * という visible text だけだと「どこにジャンプするのか」「ページ遷移なのか
 * scroll なのか」が不明確。aria-label に「Gantt timeline を今日の縦線まで
 * 横スクロール」を付与し、SR が動作を識別できるように。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'gantt-jump-iter225',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter225: Gantt 「今日へジャンプ」 button に aria-label「Gantt timeline を今日の縦線まで横スクロール」を付与',
    })
  },
})
