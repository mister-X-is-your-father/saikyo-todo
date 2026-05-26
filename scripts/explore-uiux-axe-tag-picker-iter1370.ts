/**
 * playwright-iter1370 (mode-D fix): iter1369 横展開。ItemEditDialog 内 TagPicker の
 * trigger button (未選択時) placeholder「タグなし」(`text-muted-foreground`) が
 * outline button bg (#f5f5f5) 上で 4.5:1 未満になる contrast 違反 (iter1369 AssigneePicker と同型)。
 *
 * 本 script は dialog → tag-picker-trigger を開いて axe scan。修正前: violation / 修正後: 0。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-tag-picker-iter1370.ts
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
      runOnly: { type: 'rule', values: ['color-contrast'] },
    })
  })
  const viol = results.violations as Array<{
    id: string
    impact: string
    nodes: Array<{ html: string }>
  }>
  console.log(`\n[${label}] color-contrast violations=${viol.length}`)
  for (const v of viol) {
    for (const node of v.nodes) {
      console.log(`  ${node.html.slice(0, 100)}`)
      findings.push({
        level: 'warning',
        source: 'a11y',
        message: `${label} color-contrast: ${node.html.slice(0, 80)}`,
      })
    }
  }
}

void runExplore({
  name: 'axe-tag-picker-iter1370',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'tag picker audit item',
      status: 'todo',
      priority: 3,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(700)
    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)

    const trigger = page.locator('[data-testid="tag-picker-trigger"]').first()
    if ((await trigger.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'tag-picker-trigger not found',
      })
      return
    }
    await trigger.click()
    await page.waitForTimeout(500)
    await scan(page, 'tag-picker open', findings)
  },
})
