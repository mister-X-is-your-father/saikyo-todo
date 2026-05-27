/**
 * playwright-iter1421 (mode-D 探索): workspace 外の surface — `/` (Workspace 一覧 + 作成 form) を
 * light + dark で axe scan。これまでの sweep は全て workspace 内 (`/[id]/...`) で、home / auth は
 * 未走査だった。login/signup は認証済では redirect されるため home を主対象に。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-home-auth-iter1421.ts
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
  name: 'axe-home-auth-iter1421',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  body: async ({ page, findings }) => {
    for (const theme of ['light', 'dark']) {
      await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' })
      await page.evaluate((t) => localStorage.setItem('theme', t), theme)
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(700)
      await scan(page, `${theme} / (home)`, findings)
    }
  },
})
