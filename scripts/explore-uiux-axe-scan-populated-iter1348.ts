/**
 * playwright-iter1348: axe-core WCAG scan を「データ投入済」状態の goals / sprints
 * page に流す regression guard。
 *
 * iter1347 で判明: axe violation は **data 状態依存** (空 view と populated view で
 * 異なる、例: gantt は item 無 EmptyState で 0、item 描画で日付ルーラー contrast)。
 * 本 script は goal + KR / active sprint を seed して populated 状態を scan し、
 * これら page が data 有でも clean を保つことを保証する。結果: 両 page 0 violation。
 *
 * 既知の deferred 項目 (本 script の対象外):
 *   - gantt-view の bar 内 white text on rgba(blue/red, 0.8-0.9) (bar 背景色が
 *     淡く white text が 4.5:1 未満)。bar 配色 / baseline 重ね順を変える design 判断を
 *     伴うため small a11y polish の scope 外。bar label は aria-hidden で bar 自身の
 *     role=button aria-label に全情報あり (SR は無影響、視覚 contrast のみ)。
 *
 * 探索 script (経路 B)。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

async function scan(
  page: import('@playwright/test').Page,
  label: string,
  findings: import('./lib/explore-uiux-runner').Finding[],
) {
  await page.evaluate(AXE_SRC)
  const results = await page.evaluate(async () => {
    // @ts-expect-error axe injected at runtime
    return await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
      },
    })
  })
  const viol = results.violations as Array<{
    id: string
    impact: string
    nodes: Array<{ html: string }>
  }>
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 70)}`)
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-scan-populated-iter1348',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const s = new Date().toISOString().slice(0, 10)
    const e = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const g = await admin
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        title: 'Goal A',
        period: 'quarterly',
        start_date: s,
        end_date: e,
        status: 'active',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (g.data) {
      await admin
        .from('key_results')
        .insert({
          workspace_id: workspaceId,
          goal_id: g.data.id,
          title: 'KR 1',
          progress_mode: 'manual',
          current_value: 3,
          target_value: 10,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        })
    }
    await admin
      .from('sprints')
      .insert({
        workspace_id: workspaceId,
        name: 'Sprint 1',
        start_date: s,
        end_date: e,
        status: 'active',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await scan(page, 'goals populated', findings)
    await page.goto(`http://localhost:3001/${workspaceId}/sprints`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await scan(page, 'sprints populated', findings)
  },
})
