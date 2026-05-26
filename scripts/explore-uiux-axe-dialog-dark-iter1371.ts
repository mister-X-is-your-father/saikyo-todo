/**
 * playwright-iter1371 (mode-D 探索): dark theme で ItemEditDialog base tab +
 * AssigneePicker / TagPicker combobox を開いて axe WCAG scan。
 *
 * iter1337 の dark scan は static route (idle) のみで、open-dialog / combobox 内部は
 * 未踏。iter1367/1369/1370 の light contrast fix が dark token でも保たれるか確認 +
 * dark 固有の割れ (反転 token / opacity 系) を洗い出す。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-dialog-dark-iter1371.ts
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
  name: 'axe-dialog-dark-iter1371',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'dark dialog audit item',
      status: 'in_progress',
      priority: 2,
      is_must: true,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    // dark theme を固定 (next-themes key='theme') してから reload
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log(`[theme] dark class = ${isDark}`)

    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)
    await scan(page, 'dark dialog base', findings)

    const ap = page.locator('[data-testid="assignee-picker-trigger"]').first()
    if ((await ap.count()) > 0) {
      await ap.click()
      await page.waitForTimeout(400)
      await scan(page, 'dark assignee-picker', findings)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
    const tp = page.locator('[data-testid="tag-picker-trigger"]').first()
    if ((await tp.count()) > 0) {
      await tp.click()
      await page.waitForTimeout(400)
      await scan(page, 'dark tag-picker', findings)
    }
  },
})
