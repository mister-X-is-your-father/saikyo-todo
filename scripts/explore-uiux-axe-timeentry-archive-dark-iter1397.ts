/**
 * playwright-iter1397 (mode-D 探索): dark theme で /time-entries (実 time_entry 投入) と
 * /archive (archived item 投入) を axe scan。両 page とも **populated × dark** は未踏
 * (iter1333 は empty、iter1374 は okr/pdca/templates のみ)。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-timeentry-archive-dark-iter1397.ts
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
  const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`\n[${label}] violations=${viol.length} (serious/critical=${interesting.length})`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-timeentry-archive-dark-iter1397',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    // archived item
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'アーカイブ済の MUST タスク',
      description: '',
      status: 'done',
      is_must: true,
      priority: 1,
      due_date: t,
      archived_at: new Date().toISOString(),
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
    // time entry
    const te = await admin
      .from('time_entries')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        work_date: t,
        category: '開発',
        description: '実装作業',
        duration_minutes: 90,
        sync_status: 'pending',
      })
      .select('id')
    console.log(`[seed] te error=${JSON.stringify(te.error)}`)
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    for (const sub of ['/time-entries', '/archive']) {
      await page.goto(`http://localhost:3001/${workspaceId}${sub}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      await scan(page, `dark ${sub}`, findings)
    }
  },
})
