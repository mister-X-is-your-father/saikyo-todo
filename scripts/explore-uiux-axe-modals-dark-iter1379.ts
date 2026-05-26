/**
 * playwright-iter1379 (mode-D 探索): dark theme で KeybindingsHelpModal (? key) と
 * NotificationPreferences dialog (gear button) を開いて axe scan。両 modal とも
 * dark で開いた状態は未踏 surface。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-modals-dark-iter1379.ts
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
    return await window.axe.run('[role="dialog"]', {
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
  name: 'axe-modals-dark-iter1379',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(600)

    // 1. NotificationPreferences dialog (gear button)
    const prefBtn = page.locator('[data-testid="notification-preferences"]').first()
    if ((await prefBtn.count()) > 0) {
      await prefBtn.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(400)
      if ((await page.locator('[role="dialog"]').count()) > 0) {
        await scan(page, 'dark notif-prefs', findings)
      } else {
        console.log('notif-prefs dialog did not open')
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    } else {
      console.log('notif-prefs button not found')
    }

    // 2. KeybindingsHelpModal (? key = Shift+/)
    await page.keyboard.press('Shift+Slash')
    await page.waitForTimeout(400)
    const help = page.locator('[data-testid="keybindings-help-modal"]')
    console.log(`[keybindings-help-modal] count=${await help.count()}`)
    if ((await page.locator('[role="dialog"]').count()) > 0) {
      await scan(page, 'dark keybindings-help', findings)
    } else {
      console.log('keybindings-help did not open')
    }
  },
})
