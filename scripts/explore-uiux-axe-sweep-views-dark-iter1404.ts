/**
 * playwright-iter1404 (mode-D 探索 sweep): populated workspace (item 多 status / MUST /
 * overdue / done) を seed し、main view 群 (Today / Inbox / Kanban / Backlog / Gantt /
 * Dashboard / PDCA) を **dark** で axe scan。直近 fire は 1 画面ずつだったので、横断 sweep で
 * 取り残し contrast / structure violation を洗い出す。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-sweep-views-dark-iter1404.ts
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
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 90)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-sweep-views-dark-iter1404',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = [
      {
        title: '今日締切の MUST',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: today,
        scheduled_for: today,
      },
      { title: '進行中の調査', status: 'in_progress', is_must: false, priority: 2 },
      { title: '完了済み', status: 'done', is_must: false, priority: 3 },
      {
        title: '期限超過 MUST',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: '2026-05-01',
        scheduled_for: today,
      },
    ]
    for (const r of rows) {
      const { error } = await admin.from('items').insert({
        workspace_id: workspaceId,
        description: '',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
        ...r,
      })
      if (error) console.error('[seed] item err', error.message)
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    // dark theme をセット
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    const views = ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']
    for (const v of views) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(900)
      await scan(page, `dark ?view=${v}`, findings)
    }
    await page.goto(`http://localhost:3001/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await scan(page, 'dark /pdca', findings)
  },
})
