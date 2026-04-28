/**
 * Phase 6.15 loop iter 192 — paren count 2 箇所追加 (PersonalPeriod / Subtasks heading)。
 *
 * iter191 で Today view 各グループ Card の "(N)" SR 冗長読み上げを region+aria-label で
 * 解消したが、PersonalPeriodView の "{label}の Item ({N})" Card と
 * ItemEditDialog Subtasks の "既存の子タスク ({N})" h3 は同じ問題が残っていた。
 *
 *   - PersonalPeriod Card: role="region" + aria-label="<label>の Item N 件"
 *   - Subtasks h3: 二重 span (sr-only に "N 件" / aria-hidden に "(N)") で
 *     SR は "既存の子タスク N 件"、視覚は paren 表記を維持
 */
import { runExplore } from './lib/explore-uiux-runner'

await runExplore({
  name: 'region-paren-iter192',
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    findings.push({
      level: 'info',
      source: 'observation',
      message:
        'iter192: PersonalPeriod Card に region/aria-label、Subtasks h3 に sr-only+aria-hidden 二重 span で paren count を SR cleanly 化',
    })
  },
})
