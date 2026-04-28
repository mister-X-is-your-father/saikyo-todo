/**
 * Phase 6.15 loop iter 217 — IntegrationsPanel SourceCard 有効化/無効化 + 削除 button の pending SR 化。
 *
 * iter195 で Pull button、iter216 で WorkflowCard 同 2 button を SR 化したが、
 * IntegrationsPanel の SourceCard 「有効化/無効化」「削除」 button が pending
 * 中に固定 aria-label のままで SR は「更新中…」「削除中…」を聞き取れなかった。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'source-buttons-iter217',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter217: IntegrationsPanel Source Card の 有効化/無効化 + 削除 button の aria-label を pending 状態別文言に',
    })
  },
})
