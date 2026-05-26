/**
 * playwright-iter1378 (mode-D 探索): DataWidgetCard の error 状態
 * (`text-destructive` on `bg-rose-50`) が dark で contrast 割れするか検証。
 *
 * error 状態は widget query 失敗時のみ render されるため、server action POST を
 * route abort で失敗させて error 状態 (role=alert) を強制発火 → dark で scan。
 *
 * **結論 (iter1378)**: dark でも **0 violation = clean**。当初 iter1376 recovery-plan と
 * 同 root cause を疑ったが、recovery-plan の失敗は `bg-rose-50/40` の opacity blend +
 * 内側 `bg-white` 由来で、本 card の **solid `bg-rose-50` + theme-aware `text-destructive`**
 * は dark でも 4.5:1 を満たす (axe 実測)。fix 不要と確認、本 script は regression guard。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-widget-error-dark-iter1378.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-widget-error-dark-iter1378',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  body: async ({ page, workspaceId, findings }) => {
    // 先に dark を固定 (まだ abort してない状態で navigate)
    await page.goto(`http://localhost:3001/${workspaceId}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))

    // server action (POST) を abort して widget query を失敗させる
    await page.route('**/*', (route) => {
      const req = route.request()
      if (req.method() === 'POST') return route.abort()
      return route.continue()
    })

    // sprint page (sprint-retro / sprint-risk-board widget が DataWidgetCard を使う) へ
    await page.goto(`http://localhost:3001/${workspaceId}/sprints`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(2500)

    const alert = page.locator('[role="alert"]')
    const alertCount = await alert.count()
    console.log(`[role=alert] count=${alertCount}`)
    if (alertCount === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'widget error 状態を発火できず (route abort で error が出ない)',
      })
      return
    }

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run('[role="alert"]', {
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
          `  ${node.html.slice(0, 70)} | ${d?.contrastRatio} fg ${d?.fgColor} bg ${d?.bgColor}`,
        )
        findings.push({
          level: 'warning',
          source: 'a11y',
          message: `widget error dark color-contrast: ${node.html.slice(0, 60)} (${d?.contrastRatio})`,
        })
      }
    }
    console.log(`[dark widget error] color-contrast violations=${total}`)
  },
})
