/**
 * playwright-iter1335: axe-core WCAG scan を home の view 切替状態に拡張。
 *
 * iter1327-1334 で 9 認証 route の color-contrast を 0 にしたが、home の
 * `?view=` で切り替わる sub-view (inbox / kanban / backlog / gantt /
 * dashboard) は EmptyState chip 等が view 固有なため未 cover。本 script は
 * `?view=` param で各 view を render し scan する。
 *
 * 探索 script (経路 B)。violation を見つけたら個別 iter で fix。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

const VIEWS = ['inbox', 'kanban', 'backlog', 'gantt', 'dashboard']

void runExplore({
  name: 'axe-scan-views-iter1335',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    for (const view of VIEWS) {
      const route = `/${workspaceId}?view=${view}`
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
        `\n[view ${view}] violations=${viol.length} (critical/serious=${interesting.length})`,
      )
      for (const v of viol) {
        console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length}`)
        for (const n of v.nodes.slice(0, 4)) console.log(`      @ ${n.target.join(' ')}`)
      }
      for (const v of interesting) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `view=${view} ${v.impact} ${v.id} ×${v.nodes.length} @ ${v.nodes[0]?.target.join(' ')}`,
        })
      }
    }
  },
})
