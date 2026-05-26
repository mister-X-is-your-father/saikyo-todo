/**
 * playwright-iter1389 (mode-D 探索/fix): dark theme で TaskChute view の cumulative
 * remaining ticker (合計/完了/残 の estimate 表示) を **実 estimate 投入** で render して scan。
 *
 * iter1368 の taskchute light scan は seed bug で空 (ticker 非表示) だったため、ticker の
 * `text-emerald-700` (完了) / `text-amber-700` (残) の dark contrast は未検証だった。
 * estimate は description から `extractEstimateMinutes` で抽出されるため description に
 * `30分` / `1時間` を埋めて scheduled_for=today で seed する。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-taskchute-dark-iter1389.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-taskchute-dark-iter1389',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const r = await admin
      .from('items')
      .insert([
        {
          workspace_id: workspaceId,
          title: '完了タスク',
          description: '見積 30分',
          status: 'done',
          is_must: false,
          priority: 2,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
        {
          workspace_id: workspaceId,
          title: '残タスク',
          description: '見積 1時間',
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
    await page.goto(`http://localhost:3001/${workspaceId}?mode=taskchute`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)

    // ticker bar が出ているか (合計 estimate > 0)
    const tickerVisible = await page.locator('[data-testid="taskchute-ticker-summary"]').count()
    console.log(`[ticker] visible≈${tickerVisible}`)

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
          message: `taskchute dark color-contrast: ${node.html.slice(0, 60)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[taskchute dark] color-contrast violations=${total}`)
  },
})
