/**
 * playwright-iter1337: axe-core WCAG scan を dark theme で実行。
 *
 * iter1327-1336 で light theme idle の color-contrast を全画面 0 にした。
 * dark theme は別 token (bg/fg 反転、border 薄) なので light で pass でも
 * dark で割るケースがある (特に hardcoded 色 / opacity 系)。next-themes は
 * `.dark` class を html に付ける (localStorage `theme`='dark' で固定)。
 *
 * 探索 script (経路 B)。violation を見つけたら個別 iter で fix。
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

const SUBROUTES = ['', '/templates', '/sprints', '/goals', '/workflows', '/time-entries']

void runExplore({
  name: 'axe-scan-dark-iter1337',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    // dark theme を localStorage に固定 (next-themes key='theme')
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))

    for (const sub of SUBROUTES) {
      const route = `/${workspaceId}${sub}`
      await page.goto(`http://localhost:3001${route}`, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(700)
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
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
        `\n[route ${sub || '/'}] dark=${isDark} violations=${viol.length} (critical/serious=${interesting.length})`,
      )
      for (const v of viol) {
        console.log(`  [${v.impact}] ${v.id} ×${v.nodes.length}`)
        for (const n of v.nodes.slice(0, 4)) console.log(`      @ ${n.target.join(' ')}`)
      }
      for (const v of interesting) {
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `dark ${sub || '/'} ${v.impact} ${v.id} ×${v.nodes.length} @ ${v.nodes[0]?.target.join(' ')}`,
        })
      }
    }
  },
})
