/**
 * playwright-iter1416 (mode-D 探索): main view 群 (today / inbox / kanban / backlog / gantt /
 * dashboard) を **light** で populated axe scan。iter1404 は dark のみだったので light の
 * 取り残し contrast / structure を確認 (直近 fire は dark 重点で light は旧 iter 依存)。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-main-views-light-iter1416.ts
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
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 100)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-main-views-light-iter1416',
  viewport: { width: 1280, height: 900 },
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
        title: '進行中',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '完了',
        description: '',
        status: 'done',
        is_must: false,
        priority: 3,
        completed_at: new Date().toISOString(),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '期限超過 MUST',
        description: '',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: '2026-05-01',
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    for (const v of ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(900)
      await scan(page, `light ?view=${v}`, findings)
    }
  },
})
