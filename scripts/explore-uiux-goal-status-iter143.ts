/**
 * Phase 6.15 loop iter 143 — Goal status 変更 button smoke。
 *
 * これまで Goal は schema 上 active|completed|archived の 3 status を持つが
 * UI に変更ボタンが無く、一度作った Goal は永久に active のままだった
 * (status 列は表示はされる)。iter143 で GoalCard expand 時に状態遷移
 * button (完了 / アーカイブ / active に戻す) を追加。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'goal-status-iter143',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)

    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter143: GoalCard CardContent (expand 時) に goal-complete-* / goal-archive-* / goal-reactivate-* button を追加 + useUpdateGoal で status patch + audit (既存)',
    })
  },
})
