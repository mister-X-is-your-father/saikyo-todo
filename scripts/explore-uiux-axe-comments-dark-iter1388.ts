/**
 * playwright-iter1388 (mode-D 探索): dark theme で ItemEditDialog comments tab を
 * **実コメント投入** で render して axe scan。iter1375 の dark comments tab は
 * コメント 0 件 (空) だったため、author / AI badge / timestamp / body の dark
 * contrast は未検証だった。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-comments-dark-iter1388.ts
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
    nodes: Array<{
      html: string
      any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
    }>
  }>
  const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`\n[${label}] violations=${viol.length} (serious/critical=${interesting.length})`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 85)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-comments-dark-iter1388',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const it = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'コメント audit item',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (it.data) {
      await admin.from('comments_on_items').insert([
        {
          item_id: it.data.id,
          body: 'ユーザからのコメントです。dark contrast を確認します。',
          author_actor_type: 'user',
          author_actor_id: userId,
        },
        {
          item_id: it.data.id,
          body: 'AI Agent からのコメント (🤖 marker 等の dark 表示確認)。',
          author_actor_type: 'agent',
          author_actor_id: userId,
        },
      ])
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)

    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)
    for (const tab of ['comments', 'activity']) {
      const trigger = page.locator(`[data-testid="tab-${tab}"]`).first()
      if ((await trigger.count()) === 0) continue
      await trigger.click()
      await page.waitForTimeout(700)
      const cCount = await page.locator('[data-testid^="comment-"]').count()
      console.log(`tab-${tab}: comment-like els=${cCount}`)
      await scan(page, `dark tab-${tab}`, findings)
    }
  },
})
