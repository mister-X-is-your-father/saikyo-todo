/**
 * playwright-iter1408 (mode-D 探索): header から開く portal overlay 群を **dark** で axe scan。
 *   1. 通知設定 dialog (gear button)
 *   2. NotificationBell popover (通知ボタン)
 *   3. コマンドパレット (cmdk, Cmd/Ctrl+K)
 * これらは iter1404 view sweep / iter1405 dialog tab sweep の非対象。portal 内 contrast /
 * structure / nested-interactive を確認。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-overlays-dark-iter1408.ts
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
  name: 'axe-overlays-dark-iter1408',
  viewport: { width: 1280, height: 900 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)

    // 1. 通知設定 dialog
    const gear = page.locator('button[aria-label^="通知設定"]')
    if ((await gear.count()) > 0) {
      await gear.click()
      await page.waitForSelector('[role=dialog]', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
      await scan(page, 'dark 通知設定dialog', findings)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      console.log('[skip] gear button not found')
    }

    // 2. NotificationBell popover
    const bell = page.locator('button[aria-label^="通知 ("]')
    if ((await bell.count()) > 0) {
      await bell.click()
      await page.waitForTimeout(600)
      await scan(page, 'dark 通知bell', findings)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      console.log('[skip] bell button not found')
    }

    // 3. コマンドパレット (cmdk)
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(700)
    await scan(page, 'dark コマンドパレット', findings)
  },
})
