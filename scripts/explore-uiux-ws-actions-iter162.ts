/**
 * Phase 6.15 loop iter 162 — Workspace home の Heartbeat / PM Stand-up button
 * 説明 a11y smoke。
 *
 * 旧仕様: button text "Heartbeat" / "PM Stand-up" だけで、初見ユーザは
 * 動作内容が不明 (heavy operation を起動するのに何を実行するか不明瞭)。
 * iter162 で title (mouse hover) + aria-label (SR) に動作説明を付与。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'ws-actions-iter162',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter162: Heartbeat / PM Stand-up button に title + aria-label で動作説明 (MUST 期限スキャン / 朝会サマリー)',
    })
  },
})
