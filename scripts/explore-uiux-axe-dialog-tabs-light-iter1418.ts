/**
 * playwright-iter1418 (mode-D 探索): ItemEditDialog の全 6 tab を **light** で axe scan。
 * iter1405 は dark のみ。iter1416/1417 で light に取り残し (dashboard amber-600 / dl role=img)
 * があったので dialog の light も severity-colored text / structure を横断確認。MUST + overdue +
 * 説明文付き item で base tab に severity 表示を出す。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-dialog-tabs-light-iter1418.ts
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
  name: 'axe-dialog-tabs-light-iter1418',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'light dialog scan 用 期限超過 MUST',
      description: '説明テキスト\n- 箇条書き 1\n- 箇条書き 2',
      status: 'in_progress',
      is_must: true,
      priority: 1,
      due_date: '2026-05-01',
      scheduled_for: new Date().toISOString().slice(0, 10),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    await page.locator('[data-testid^=backlog-title-]').first().click()
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(500)
    for (const t of [
      'tab-base',
      'tab-summary',
      'tab-subtasks',
      'tab-dependencies',
      'tab-comments',
      'tab-activity',
    ]) {
      const trigger = page.locator(`[data-testid=${t}]`)
      if ((await trigger.count()) === 0) continue
      await trigger.click()
      await page.waitForTimeout(600)
      await scan(page, `light dialog ${t}`, findings)
    }
  },
})
