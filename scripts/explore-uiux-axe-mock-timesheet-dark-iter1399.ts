/**
 * playwright-iter1399 (mode-D 探索): dark theme で mock-timesheet サブアプリ
 * (/mock-timesheet/login, /new) を axe scan。別系統 UI で dark scan 未踏。
 * theme-aware class (text-destructive/muted-foreground) 主体のため clean を期待する guard。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-mock-timesheet-dark-iter1399.ts
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
  const interesting = viol.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`\n[${label}] violations=${viol.length} (serious/critical=${interesting.length})`)
  for (const v of viol) {
    const d = v.nodes[0]?.any?.[0]?.data
    console.log(
      `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
    )
    findings.push({
      level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
      source: 'a11y',
      message: `${label} ${v.impact} ${v.id} ×${v.nodes.length}`,
    })
  }
}

void runExplore({
  name: 'axe-mock-timesheet-dark-iter1399',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, findings }) => {
    await page.goto('http://localhost:3001/mock-timesheet/login', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await scan(page, 'dark mock-login', findings)

    await page.goto('http://localhost:3001/mock-timesheet/new', { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await scan(page, 'dark mock-new', findings)
  },
})
