/**
 * playwright-iter1407 (mode-D 探索): workspace sub-page 群 (goals / sprints / workflows /
 * integrations / templates / pdca) を axe scan。iter1406 で /archive の empty state が
 * heading-order skip (h1→h3) だったので、同型 (WorkspaceHeader h1 直下に panel EmptyState
 * h3) が他 sub-page にも無いか横断確認。empty state 中心 (新規 workspace) で structure を見る。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-subpages-heading-iter1407.ts
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
  console.log(`\n[${label}] violations=${viol.length}`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 100)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-subpages-heading-iter1407',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    const subs = ['goals', 'sprints', 'workflows', 'integrations', 'templates', 'pdca']
    for (const s of subs) {
      await page.goto(`http://localhost:3001/${workspaceId}/${s}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(900)
      // 各 page の heading 一覧も出す (skip 診断用)
      const headings = await page.evaluate(() =>
        [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
          .filter(
            (h) => (h as HTMLElement).offsetParent !== null || h.className.includes('sr-only'),
          )
          .map((h) => `${h.tagName}:${(h.textContent || '').trim().slice(0, 24)}`),
      )
      console.log(`  headings[${s}]: ${headings.join(' | ')}`)
      await scan(page, `/${s}`, findings)
    }
  },
})
