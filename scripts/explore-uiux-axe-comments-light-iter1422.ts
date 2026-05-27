/**
 * playwright-iter1422 (mode-D 探索): ItemEditDialog の コメント tab を **実コメント populated** ×
 * **light** で axe scan。iter1388 が dark populated を済ませており、その light 版補完。
 * mention (@) 入りと通常コメントを混在させる。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-comments-light-iter1422.ts
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
  name: 'axe-comments-light-iter1422',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const item = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'コメント light scan 用 item',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
    const itemId = item.data?.[0]?.id
    if (item.error) console.error('[seed] item err', item.error.message)
    if (itemId) {
      const c = await admin.from('comments_on_items').insert([
        {
          item_id: itemId,
          body: '最初のコメントです。確認お願いします。',
          author_actor_type: 'user',
          author_actor_id: userId,
        },
        {
          item_id: itemId,
          body: '@dev レビューしました、LGTM です 👍',
          author_actor_type: 'user',
          author_actor_id: userId,
        },
      ])
      if (c.error) console.error('[seed] comment err', c.error.message)
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.waitForTimeout(800)
    await page.locator('[data-testid^=backlog-title-]').first().click()
    await page.waitForSelector('[data-slot=dialog-content]', { timeout: 8000 })
    await page.waitForTimeout(400)
    const tab = page.locator('[data-testid=tab-comments]')
    if ((await tab.count()) === 0) {
      findings.push({ level: 'warning', source: 'observation', message: 'tab-comments が無い' })
      return
    }
    await tab.click()
    await page.waitForTimeout(900)
    await scan(page, 'light dialog comments (populated)', findings)
  },
})
