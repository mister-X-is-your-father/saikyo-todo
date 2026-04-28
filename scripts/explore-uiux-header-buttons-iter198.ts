/**
 * Phase 6.15 loop iter 198 — workspace header の Engineer / Stand-up / Heartbeat button を
 * pending 状態に応じた aria-label に切替え。
 *
 * iter194-197 同パターン: いずれも pending 中に disabled になるが aria-label が
 * 固定文言で SR ユーザに「実行中」が伝わらなかった。
 *   - EngineerTriggerButton (item-edit-dialog 上)
 *   - StandupButton (workspace header)
 *   - HeartbeatButton (workspace header)
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'header-buttons-iter198',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter198: Engineer/Standup/Heartbeat button の aria-label を pending 状態別文言に切替え (iter194-197 同パターン)',
    })
  },
})
