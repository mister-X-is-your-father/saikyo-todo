/**
 * playwright-iter1365 (mode-D 探索): axe-core WCAG scan を item 投入済の主要
 * view (today / inbox / kanban / backlog / gantt / dashboard) に横断で流し、
 * data 有状態でのみ出る violation を洗い出す探索 script。
 *
 * 経路 B。findings はログに集計、修正は別 iter / 同 iter で 1 件のみ。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-views-iter1365.ts
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
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 90)}`)
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-views-iter1365',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const overdue = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: 'MUST overdue item',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: overdue,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: 'In progress item',
        status: 'in_progress',
        priority: 2,
        due_date: future,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: 'Done item',
        status: 'done',
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    const views = ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']
    for (const v of views) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(800)
      await scan(page, v, findings)
    }
  },
})
