/**
 * playwright-iter1375 (mode-D 探索): dark theme で ItemEditDialog の全 tab
 * (base / summary / subtasks / dependencies / comments / activity) を axe scan。
 *
 * iter1367 は light で 6 tab を 0 にし、iter1371 の dark scan は base tab のみだった。
 * dependencies / subtasks / comments / activity tab の dark contrast は未踏。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-dialog-tabs-dark-iter1375.ts
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
    return await window.axe.run('[role="dialog"]', {
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
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 100)}`)
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-dialog-tabs-dark-iter1375',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'dark dialog tab audit item',
      description: 'audit 用の説明テキスト',
      status: 'in_progress',
      priority: 2,
      is_must: true,
      start_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[theme] dark = ${isDark}`)

    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)

    for (const tab of ['base', 'summary', 'subtasks', 'dependencies', 'comments', 'activity']) {
      const trigger = page.locator(`[data-testid="tab-${tab}"]`).first()
      if ((await trigger.count()) === 0) {
        console.log(`  tab-${tab}: not found`)
        continue
      }
      await trigger.click()
      await page.waitForTimeout(500)
      await scan(page, `dark tab-${tab}`, findings)
    }
  },
})
