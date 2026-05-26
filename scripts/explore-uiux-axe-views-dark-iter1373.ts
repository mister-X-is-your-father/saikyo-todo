/**
 * playwright-iter1373 (mode-D 探索): dark theme + item 投入済の主要 view
 * (today/inbox/kanban/backlog/gantt/dashboard) を axe WCAG scan。
 *
 * iter1337 の dark scan は idle/empty route のみ、iter1365 の populated scan は light のみ。
 * その交差 (dark × populated view) は未踏で、iter1371 のように dark 固有 contrast
 * (hardcoded 色 / status 色 / priority dot 等) が潜む可能性がある。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-views-dark-iter1373.ts
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
  const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`\n[${label}] violations=${viol.length} (serious/critical=${interesting.length})`)
  for (const v of viol) {
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 90)}`)
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-views-dark-iter1373',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const overdue = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    await admin.from('items').insert([
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
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    // dark theme 固定
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[theme] dark = ${isDark}`)

    for (const v of ['today', 'inbox', 'kanban', 'backlog', 'gantt', 'dashboard']) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(900)
      await scan(page, `dark ${v}`, findings)
    }
  },
})
