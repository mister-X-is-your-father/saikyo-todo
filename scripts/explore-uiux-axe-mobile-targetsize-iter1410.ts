/**
 * playwright-iter1410 (mode-M 探索): iPhone 13 viewport で main view 群 (today / inbox /
 * kanban / backlog) を populated で axe scan。tag に **wcag22aa を追加** し target-size
 * (WCAG 2.5.8 最小 tap target) を含めて検査。mobile + 2.2 tap-target は直近 fire 非重点。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-mobile-targetsize-iter1410.ts
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
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
    })
  })
  const viol = results.violations as Array<{
    id: string
    impact: string
    nodes: Array<{ html: string; any: Array<{ data: unknown }> }>
  }>
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 110)}`)
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-mobile-targetsize-iter1410',
  device: 'iPhone 13',
  isMobile: true,
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: '今日締切 MUST',
        description: '',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: today,
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '未整理タスク',
        description: '',
        status: 'todo',
        is_must: false,
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '進行中タスク',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    for (const v of ['today', 'inbox', 'kanban', 'backlog']) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(900)
      await scan(page, `mobile ?view=${v}`, findings)
    }
  },
})
