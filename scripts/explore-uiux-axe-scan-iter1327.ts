/**
 * playwright-iter1327: axe-core 自動 WCAG scan を主要 route に流す探索 script。
 *
 * iter1325/1326 の手書き accessible-name audit は名前付けのみを見ていたが、
 * axe-core は color-contrast (1.4.3) / heading-order (1.3.1) / landmark /
 * aria-* role 整合 / list 構造 など 90+ rule を一括検査する。
 * idle page を 6 route 巡回し violation を集計する。
 *
 * 探索 script (経路 B)。violation を見つけたら個別 iter で fix し
 * 本 script を regression guard 化する。impact critical/serious を優先。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

const SUBROUTES = ['', '/templates', '/sprints', '/goals', '/pdca', '/time-entries']

void runExplore({
  name: 'axe-scan-iter1327',
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
        nodes: Array<{ target: string[]; failureSummary?: string }>
      }>
      const interesting = viol.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      console.log(
        `\n[route ${sub || '/'}] violations=${viol.length} (critical/serious=${interesting.length})`,
      )
      for (const v of viol) {
        console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length}`)
        for (const n of v.nodes.slice(0, 3)) console.log(`      @ ${n.target.join(' ')}`)
      }
      for (const v of interesting) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `${sub || '/'} ${v.impact} ${v.id} ×${v.nodes.length} @ ${v.nodes[0]?.target.join(' ')}`,
        })
      }
    }
  },
})
