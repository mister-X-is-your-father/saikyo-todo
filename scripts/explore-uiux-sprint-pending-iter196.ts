/**
 * Phase 6.15 loop iter 196 — Sprint 振り返り / Pre-mortem button の pending SR 化。
 *
 * iter194 / 195 と同パターン: 振り返り / Pre-mortem button が pending 中に
 * disabled になるが、aria-label が固定文言で「生成中…」と分からなかった。
 * pending / 通常 (再生成 / 初回) の 2-3 状態別文言に切替え。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'sprint-pending-iter196',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter196: Sprint 振り返り / Pre-mortem button の aria-label を pending 状態別文言に切替え (iter194/195 同パターン)',
    })
  },
})
