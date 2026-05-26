/**
 * playwright-iter1368 (mode-D 探索): iter1365 で未 scan だった view を axe scan。
 *   - daily / weekly / monthly (personal-period-view)
 *   - taskchute mode (?mode=taskchute, taskchute-view)
 * これらは bg-primary/5 等の faint tint box を持つため iter1367 と同種の
 * contrast 違反が潜む可能性がある。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-views-extra-iter1368.ts
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
  name: 'axe-views-extra-iter1368',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: '今日の予定タスク',
        status: 'todo',
        priority: 2,
        is_must: true,
        due_date: t,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '進行中タスク',
        status: 'in_progress',
        priority: 1,
        scheduled_for: t,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    const targets: Array<{ label: string; url: string }> = [
      { label: 'daily', url: `/${workspaceId}?view=daily` },
      { label: 'weekly', url: `/${workspaceId}?view=weekly` },
      { label: 'monthly', url: `/${workspaceId}?view=monthly` },
      { label: 'taskchute', url: `/${workspaceId}?mode=taskchute` },
    ]
    for (const { label, url } of targets) {
      await page.goto(`http://localhost:3001${url}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await scan(page, label, findings)
    }
  },
})
