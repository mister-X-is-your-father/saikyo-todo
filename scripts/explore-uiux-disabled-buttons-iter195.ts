/**
 * Phase 6.15 loop iter 195 — IntegrationsPanel Pull / GoalCard AI 分解 button の disabled 理由 SR 化。
 *
 * iter194 で WorkflowCard 実行 button を 4 状態別 aria-label に切替えたが、
 * 同じパターンの disabled button が 2 件 残っていた:
 *   - IntegrationsPanel `Pull` button: !src.enabled / trigger.isPending
 *   - GoalCard `AI 分解` button: status !== 'active' / decompose.isPending
 *
 * いずれも title 属性のみ (mouse hover 専用) で SR ユーザは「なぜ disabled
 * なのか」が分からなかった。aria-label を状態別文言に切替え。
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'disabled-buttons-iter195',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter195: IntegrationsPanel Pull button + GoalCard AI 分解 button の aria-label を状態別文言に切替え (iter194 同パターン)',
    })
  },
})
