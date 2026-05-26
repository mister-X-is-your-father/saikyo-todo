/**
 * playwright-iter1382 (mode-D 探索): dark theme + **実際に item が render される** 主要 view
 * (today/inbox/kanban/backlog/gantt/dashboard) を axe scan。
 *
 * 重要: iter1365/1368/1373 の view scan は multi-item seed が `is_must` NOT NULL 制約で
 * 失敗 (PostgREST batch は is_must を省いた行に NULL を入れる) し **空 view を scan していた**
 * (= 0 violation は空 view の trivial 結果)。本 iter は全行に is_must を明示し、
 * 実 item 描画状態で dark contrast を再検証する。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-views-populated-dark-iter1382.ts
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
    nodes: Array<{
      html: string
      any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
    }>
  }>
  const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`\n[${label}] violations=${viol.length} (serious/critical=${interesting.length})`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 85)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-views-populated-dark-iter1382',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const overdue = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    // 全行に is_must を明示 (NOT NULL 制約 / PostgREST batch NULL 問題の回避)
    const r = await admin
      .from('items')
      .insert([
        {
          workspace_id: workspaceId,
          title: 'MUST overdue 項目',
          status: 'todo',
          is_must: true,
          priority: 1,
          start_date: overdue,
          due_date: overdue,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
        {
          workspace_id: workspaceId,
          title: '進行中 項目',
          status: 'in_progress',
          is_must: false,
          priority: 2,
          start_date: t,
          due_date: future,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
        {
          workspace_id: workspaceId,
          title: '完了 項目',
          status: 'done',
          is_must: false,
          priority: 3,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
      ])
      .select('id')
    console.log(`[seed] error=${JSON.stringify(r.error)} count=${r.data?.length}`)
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    for (const v of ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(2000)
      await scan(page, `dark ${v}`, findings)
    }
  },
})
