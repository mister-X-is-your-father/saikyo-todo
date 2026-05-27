/**
 * playwright-iter1417 (mode-D 探索): page-level surface (daily / weekly / monthly review /
 * pdca / time-entries / archive) を **light** で populated axe scan。iter1416 で dashboard の
 * light amber-600 contrast を見つけたので、light が手薄な他 page も severity-colored text
 * (red/amber-600 on white) を中心に横断確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-pages-light-iter1417.ts
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
  name: 'axe-pages-light-iter1417',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const today = new Date().toISOString().slice(0, 10)
    await admin.from('items').insert([
      {
        workspace_id: workspaceId,
        title: '本日完了 MUST',
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
        title: '期限超過 MUST',
        description: '',
        status: 'todo',
        is_must: true,
        priority: 1,
        due_date: '2026-05-01',
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
      {
        workspace_id: workspaceId,
        title: '進行中',
        description: '',
        status: 'in_progress',
        is_must: false,
        priority: 2,
        scheduled_for: today,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      },
    ])
    await admin
      .from('time_entries')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        work_date: today,
        category: '開発',
        description: 'light scan 用稼働',
        duration_minutes: 120,
        sync_status: 'failed',
        sync_error: '接続タイムアウト',
      })
  },
  body: async ({ page, workspaceId, findings }) => {
    const targets: Array<[string, string]> = [
      ['?view=daily', 'daily'],
      ['?view=weekly', 'weekly'],
      ['?view=monthly', 'monthly'],
      ['/pdca', 'pdca'],
      ['/time-entries', 'time-entries'],
      ['/archive', 'archive'],
    ]
    for (const [path, label] of targets) {
      const url = path.startsWith('?')
        ? `http://localhost:3001/${workspaceId}${path}`
        : `http://localhost:3001/${workspaceId}${path}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)
      await scan(page, `light ${label}`, findings)
    }
  },
})
