/**
 * playwright-iter1374 (mode-D 探索): dark theme + データ投入済の goals / sprints /
 * pdca / templates page を axe WCAG scan。
 *
 * iter1348 で goals/sprints の **light populated** を 0 にしたが dark は未踏。
 * iter1371 のように dark 固有 contrast (KR progress bar / sprint badge / status 色) が
 * 潜む可能性がある。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-okr-dark-iter1374.ts
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
  name: 'axe-okr-dark-iter1374',
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
      await admin.from('key_results').insert({
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
    await admin.from('sprints').insert({
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
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[theme] dark = ${isDark}`)

    for (const sub of ['/goals', '/sprints', '/pdca', '/templates']) {
      await page.goto(`http://localhost:3001/${workspaceId}${sub}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)
      await scan(page, `dark ${sub}`, findings)
    }
  },
})
