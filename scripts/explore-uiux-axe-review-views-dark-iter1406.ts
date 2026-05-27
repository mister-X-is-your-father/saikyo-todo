/**
 * playwright-iter1406 (mode-D 探索): 個人レビュー view (daily / weekly / monthly =
 * PersonalPeriodView) と /archive を **dark** で axe scan。これらは iter1404 の
 * main view sweep 非対象。time_entry + done item を seed し populated で scan。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-review-views-dark-iter1406.ts
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
  name: 'axe-review-views-dark-iter1406',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: '本日完了の MUST',
        description: '',
        status: 'done',
        is_must: true,
        priority: 1,
        due_date: today,
        scheduled_for: today,
        completed_at: new Date().toISOString(),
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '本日進行中タスク',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
    await admin.from('time_entries').insert({
      workspace_id: workspaceId,
      user_id: userId,
      work_date: today,
      category: '開発',
      description: 'レビュー view scan 用の稼働',
      duration_minutes: 120,
      sync_status: 'pending',
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    for (const v of ['daily', 'weekly', 'monthly']) {
      await page.goto(`http://localhost:3001/${workspaceId}?view=${v}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(1000)
      await scan(page, `dark ?view=${v}`, findings)
    }
    await page.goto(`http://localhost:3001/${workspaceId}/archive`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    await scan(page, 'dark /archive', findings)
  },
})
