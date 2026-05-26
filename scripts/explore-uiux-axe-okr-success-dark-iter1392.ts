/**
 * playwright-iter1392 (mode-D fix verify): goals-panel の achieved tier の goalPct
 * (`text-emerald-700`) が dark card bg 上で contrast 割れするか検証。
 *
 * KR を current=target (100%) で seed → goal tier='achieved' → goalPct が emerald-700 で render。
 * (sprints-panel:576 の done tone emerald-700 も同型、本 fix で同時対応。)
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-okr-success-dark-iter1392.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-okr-success-dark-iter1392',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const s = new Date().toISOString().slice(0, 10)
    const e = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const g = await admin
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        title: 'Achieved Goal',
        period: 'quarterly',
        start_date: s,
        end_date: e,
        status: 'active',
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    if (g.data) {
      await admin.from('key_results').insert({
        workspace_id: workspaceId,
        goal_id: g.data.id,
        title: 'KR 達成',
        progress_mode: 'manual',
        current_value: 10,
        target_value: 10,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
    }
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/goals`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run(document, {
        runOnly: { type: 'rule', values: ['color-contrast'] },
      })
    })
    const viol = results.violations as Array<{
      nodes: Array<{
        html: string
        any: Array<{ data: { contrastRatio?: number; fgColor?: string; bgColor?: string } }>
      }>
    }>
    let total = 0
    for (const v of viol) {
      for (const node of v.nodes) {
        total++
        const d = node.any?.[0]?.data
        console.log(
          `  ${node.html.slice(0, 70)} | ${d?.contrastRatio} fg ${d?.fgColor} bg ${d?.bgColor}`,
        )
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `okr success dark: ${node.html.slice(0, 55)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[okr success dark] color-contrast violations=${total}`)
  },
})
