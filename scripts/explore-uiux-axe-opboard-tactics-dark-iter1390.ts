/**
 * playwright-iter1390 (mode-D 探索/fix): operation board の forecast tactics
 * (Quick wins / 集中ブロック) headings (`text-emerald-800` on `bg-emerald-50/60` /
 * `text-sky-800` on `bg-sky-50/60`) の dark contrast を検証。
 *
 * これらは forecast.quickWins / focusBlocks が非空のときのみ render される。estimate は
 * description から抽出されるため `10分` (quick) / `2時間` (focus) を埋めて today scheduled で seed。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-opboard-tactics-dark-iter1390.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-opboard-tactics-dark-iter1390',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const r = await admin
      .from('items')
      .insert([
        {
          workspace_id: workspaceId,
          title: 'クイックウィン候補',
          description: '見積: 10分',
          status: 'todo',
          is_must: false,
          priority: 2,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
        {
          workspace_id: workspaceId,
          title: '集中ブロック候補',
          description: '見積: 2時間',
          status: 'todo',
          is_must: false,
          priority: 2,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
      ])
      .select('id')
    console.log(`[seed] error=${JSON.stringify(r.error)} count=${r.data?.length}`)
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=today`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)

    const tacticsCount = await page
      .locator('[data-testid="operation-board-forecast-tactics"]')
      .count()
    console.log(`[tactics] visible≈${tacticsCount}`)

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
          `  ${node.html.slice(0, 75)} | ${d?.contrastRatio} fg ${d?.fgColor} bg ${d?.bgColor}`,
        )
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `opboard tactics dark: ${node.html.slice(0, 55)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[opboard tactics dark] color-contrast violations=${total}`)
  },
})
