/**
 * playwright-iter1377 (mode-D 探索): dark theme で ActiveTimerPanel (右下 fixed の
 * 稼働中タイマー panel) を axe scan。Zustand store 駆動で running timer が無いと
 * 描画されないため、item dialog → StartTimer 押下で発火させてから scan する。
 * dark 未踏 surface。
 *
 * 経路 B。実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-axe-active-timer-dark-iter1377.ts
 */
import { readFileSync } from 'node:fs'

import { runExplore } from './lib/explore-uiux-runner'

const AXE_SRC = readFileSync(
  'node_modules/.pnpm/axe-core@4.11.3/node_modules/axe-core/axe.min.js',
  'utf8',
)

void runExplore({
  name: 'axe-active-timer-dark-iter1377',
  viewport: { width: 1280, height: 800 },
  exitOnFindings: false,
  seed: async (admin, { workspaceId, userId }) => {
    await admin.from('items').insert({
      workspace_id: workspaceId,
      title: 'timer audit item',
      status: 'in_progress',
      priority: 2,
      created_by_actor_type: 'user',
      created_by_actor_id: userId,
    })
  },
  body: async ({ page, workspaceId, findings }) => {
    await page.goto(`http://localhost:3001/${workspaceId}?view=backlog`, {
      waitUntil: 'networkidle',
    })
    await page.evaluate(() => localStorage.setItem('theme', 'dark'))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(700)

    const editBtn = page.locator('[data-testid^="backlog-edit-"]').first()
    if ((await editBtn.count()) === 0) {
      findings.push({ level: 'info', source: 'observation', message: 'backlog-edit not found' })
      return
    }
    await editBtn.click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.waitForTimeout(400)

    const startBtn = page.locator('[role="dialog"] [data-testid^="start-timer-"]').first()
    if ((await startBtn.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'start-timer button not found',
      })
      return
    }
    await startBtn.click()
    await page.waitForTimeout(400)
    // dialog を閉じて panel を前面に
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    const panel = page.locator('[data-testid="active-timer-panel"]')
    console.log(`[active-timer-panel] count=${await panel.count()}`)
    if ((await panel.count()) === 0) {
      findings.push({
        level: 'info',
        source: 'observation',
        message: 'active-timer-panel が出ない',
      })
      return
    }

    await page.evaluate(AXE_SRC)
    const results = await page.evaluate(async () => {
      // @ts-expect-error axe injected at runtime
      return await window.axe.run('[data-testid="active-timer-panel"]', {
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
    console.log(
      `\n[dark active-timer] violations=${viol.length} (serious/critical=${interesting.length})`,
    )
    for (const v of viol) {
      const d = v.nodes[0]?.any?.[0]?.data
      console.log(
        `  [${v.impact}] ${v.id} ×${v.nodes.length} ${v.nodes[0]?.html?.slice(0, 80)} ${d ? `(${d.contrastRatio} fg ${d.fgColor} bg ${d.bgColor})` : ''}`,
      )
      findings.push({
        level: v.impact === 'serious' || v.impact === 'critical' ? 'warning' : 'info',
        source: 'a11y',
        message: `dark active-timer ${v.impact} ${v.id} ×${v.nodes.length}`,
      })
    }
  },
})
