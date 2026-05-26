/**
 * playwright-iter1391 (mode-D fix verify): 作戦盤 forecast summary line の
 * connector text (`の見積 / 残` / `見積無 N`) が chip sevCls 色 (emerald-700 等) に
 * `opacity-80`/`opacity-70` を重ねて ~3.55:1 に落ちていた (WCAG 1.4.3、light/dark 共通 —
 * chip bg は light 固定)。opacity を外して size のみで hierarchy を保つ修正の検証。
 *
 * forecast summary は description `見積: <時間>` を持つ today item があると render。
 * 見積無 span は estimate 無 item が混在すると render される。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-opboard-forecast-summary-iter1391.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-opboard-forecast-summary-iter1391',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    const t = new Date().toISOString().slice(0, 10)
    const r = await admin
      .from('items')
      .insert([
        {
          workspace_id: workspaceId,
          title: '見積ありタスク',
          description: '見積: 45分',
          status: 'todo',
          is_must: false,
          priority: 2,
          scheduled_for: t,
          created_by_actor_type: 'user',
          created_by_actor_id: userId,
        },
        {
          workspace_id: workspaceId,
          title: '見積なしタスク',
          description: '',
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
    await page.waitForTimeout(2200)

    const fc = await page.locator('[data-testid="operation-board-forecast"]').count()
    console.log(`[forecast summary] visible≈${fc}`)

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run('[data-testid="operation-board-forecast"]', {
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
          `  ${node.html.slice(0, 60)} | ${d?.contrastRatio} fg ${d?.fgColor} bg ${d?.bgColor}`,
        )
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `forecast summary color-contrast: ${node.html.slice(0, 50)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[forecast summary] color-contrast violations=${total}`)
  },
})
