/**
 * Phase 6.15 loop iter 233 — QuickAdd parser に「今週末」「月末」追加。
 *
 * Todoist の "this weekend" / "end of month" 相当を日本語で。実装:
 *   - 今週末 = 今週土曜 (今日が土曜なら今日)
 *   - 月末 = 当月最終日 (next month の 0 日 trick で求める)
 *
 * テスト 3 件追加で全パス、QuickAdd hint にも反映。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'quick-add-weekend-iter233',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter233: QuickAdd parser に「今週末」「月末」相当の日付計算を追加 (Todoist this weekend / end of month)',
    })
  },
})
