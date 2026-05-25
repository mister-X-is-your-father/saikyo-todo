/**
 * playwright-iter1333: axe-core WCAG scan を iter1327 未 cover の認証 route に拡張。
 *
 * iter1327-1332 で 6 route (home/templates/sprints/goals/pdca/time-entries) の
 * color-contrast を 0 にした。本 script は残る認証 route
 * (/workflows /integrations /archive) を scan し、同種の EmptyState chip
 * 低コントラスト等を検出する。
 *
 * 探索 script (経路 B)。violation を見つけたら個別 iter で fix。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

const SUBROUTES = ['/workflows', '/integrations', '/archive']

void runExplore({
  name: 'axe-scan-extended-iter1333',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    for (const sub of SUBROUTES) {
      const route = `/${workspaceId}${sub}`
      await page.goto(`http://localhost:3001${route}`, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(700)
      await page.evaluate(AXE_SRC)
      const results = await page.evaluate(async () => {
        // @ts-expect-error axe injected at runtime
        return await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        })
      })
      const viol = results.violations as Array<{
        id: string
        impact: string
        nodes: Array<{ target: string[] }>
      }>
      const interesting = viol.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      console.log(
        `\n[route ${sub}] violations=${viol.length} (critical/serious=${interesting.length})`,
      )
      for (const v of viol) {
        console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length}`)
        for (const n of v.nodes.slice(0, 4)) console.log(`      @ ${n.target.join(' ')}`)
      }
      for (const v of interesting) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sub} ${v.impact} ${v.id} ×${v.nodes.length} @ ${v.nodes[0]?.target.join(' ')}`,
        })
      }
    }
  },
})
