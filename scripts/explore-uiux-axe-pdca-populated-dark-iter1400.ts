/**
 * playwright-iter1400 (mode-D 探索): dark theme で /pdca を **item 投入** で render して scan。
 * iter1374 の /pdca dark scan は item 無 (goal/sprint seed のみ) で PDCA 分布バー /
 * stats が空だった。item を status 別に投入して分布バー・カウントの dark contrast を検証。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-pdca-populated-dark-iter1400.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-pdca-populated-dark-iter1400',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const base = {
      workspace_id: workspaceId,
      is_must: false,
      description: '',
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    }
    await admin.from('items').insert([
      { ...base, title: 'Plan 項目', status: 'todo' },
      { ...base, title: 'Do 項目', status: 'in_progress' },
      { ...base, title: 'Done 項目', status: 'done' },
      { ...base, title: 'Cancelled 項目', status: 'cancelled' },
    ])
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}/pdca`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

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
    console.log(
      `\n[dark /pdca populated] violations=${viol.length} (serious/critical=${interesting.length})`,
    )
    for (const v of viol) {
      const d = v.nodes[0]?.any?.[0]?.data
      console.log(
        `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
      )
      findings.push({
        level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
        source: 'a11y',
        message: `dark pdca ${v.impact} ${v.id} ×${v.nodes.length}`,
      })
    }
  },
})
