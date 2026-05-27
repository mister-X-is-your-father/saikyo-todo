/**
 * playwright-iter1405 (mode-D 探索): ItemEditDialog を開き、全 6 tab (base / summary /
 * subtasks / dependencies / comments / activity) を順に開きながら **dark** で axe scan。
 * dialog は主要 view sweep (iter1404) に含まれない大型 surface。tab 切替で出る各 panel の
 * contrast / structure / nested-interactive を横断確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-item-edit-dialog-tabs-dark-iter1405.ts
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
    return await window.axe.run(document.querySelector('[data-slot=dialog-content]') ?? document, {
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
  name: 'axe-item-edit-dialog-tabs-dark-iter1405',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'ダイアログ tab scan 用 MUST タスク',
        description: '説明テキスト。**markdown** も含む。\n- 箇条書き 1\n- 箇条書き 2',
        status: 'in_progress',
        is_must: true,
        priority: 1,
        due_date: today,
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
    if (error) console.error('[seed] err', error.message)
    else console.log('[seed] itemId=', data?.[0]?.id)
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    // open edit dialog via the title button
    await page.locator('[data-testid^=backlog-title-]').first().click()
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(600)

    const tabs = [
      'tab-base',
      'tab-summary',
      'tab-subtasks',
      'tab-dependencies',
      'tab-comments',
      'tab-activity',
    ]
    for (const t of tabs) {
      const trigger = page.locator(`[data-testid=${t}]`)
      if ((await trigger.count()) === 0) {
        console.log(`[skip] ${t} not present`)
        continue
      }
      await trigger.click()
      await page.waitForTimeout(700)
      await scan(page, `dark dialog ${t}`, findings)
    }
  },
})
