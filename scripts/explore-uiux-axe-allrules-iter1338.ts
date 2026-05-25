/**
 * playwright-iter1338: axe-core を全 impact (minor 含む) で home + dialog open
 * 状態に流し、color-contrast 以外の rule (heading-order / region / landmark /
 * list / duplicate-id-aria / aria-* 整合) を洗い出す探索 script。
 *
 * iter1327-1337 は critical/serious の color-contrast に集中した。本 script は
 * moderate/minor も含めて report し、構造系 a11y gap を炙り出す。
 *
 * 探索 script (経路 B)。violation を見つけたら個別 iter で fix。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

async function scan(page: import('@playwright/test').Page, label: string) {
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
    help: string
    nodes: Array<{ target: string[] }>
  }>
  // color-contrast は iter1327-1337 で対応済なので除外して構造系に集中
  const structural = viol.filter((v) => v.id !== 'color-contrast')
  console.log(`\n[${label}] total violations=${viol.length}, non-contrast=${structural.length}`)
  for (const v of structural) {
    console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length} — ${v.help}`)
    for (const n of v.nodes.slice(0, 4)) console.log(`      @ ${n.target.join(' ')}`)
  }
}

void runExplore({
  name: 'axe-allrules-iter1338',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    const r = await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'allrules audit item',
      status: 'todo',
      is_must: false,
      due_date: today,
      scheduled_for: today,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    if (r.error) throw r.error
  },
  body: async ({ page, workspaceId }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await scan(page, 'home (Today, item あり)')

    // ItemEditDialog open
    await page.locator('[data-testid^="today-title-"]').first().click()
    await page.waitForTimeout(700)
    await scan(page, 'ItemEditDialog open')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // backlog view (table 構造)
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(700)
    await scan(page, 'backlog view')
  },
})
